import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import * as React from "react";
import { flushSync } from "react-dom";

import { Button, IconButton } from "./button";
import type { ButtonProps, IconButtonProps } from "./button";
import { Input } from "./field";
import type { InputProps } from "./field";
import { Link } from "./navigation";
import type { LinkProps } from "./navigation";
import type { PartProps } from "./types";

// A toolbar, as the WAI-ARIA Authoring Practices describe it (https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/): role "toolbar",
// one tab stop, the arrow keys along the toolbar's orientation move between its controls, Home and End go to the first and last,
// and a menu or popover opened from a control keeps the arrow keys to itself. Base UI does the roving focus, the role and the
// popups' keys; these parts give it Basalt's types, let Basalt's own controls be its items, and add the two things it leaves out:
// Home and End, and the page's direction (Base UI reads its own provider, not the page, so a right-to-left toolbar would walk
// backwards). A toolbar draws nothing: no class, no gap and no separator look, and a Button in it looks as it does outside.

/** What marks an item of Basalt's toolbar, so Home and End know the controls from the groups and separators between them. */
const ITEM = { "data-basalt-toolbar-item": "" } as const;

export interface ToolbarProps extends PartProps<"div"> {
  /**
   * The arrow keys that move between controls: Left and Right (horizontal, the default) or Up and Down. Say what is drawn: a
   * toolbar whose controls wrap into a grid is not one orientation, so give it no toolbar role of its own, or keep it to one row or column.
   */
  orientation?: "horizontal" | "vertical";
  /** Wrap from the last control to the first and back. On by default. */
  loopFocus?: boolean;
  /** Disable every button and input inside. A `ToolbarLink` is not disabled by it (Base UI's links have no disabled state): it keeps navigating. */
  disabled?: boolean;
}

/** The toolbar's controls in DOM order, left out any that is natively disabled (a disabled one that may take focus is not). */
function controlsOf(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-basalt-toolbar-item]")].filter((item) => item.closest("[role=toolbar]") === root && !(item as HTMLButtonElement).disabled);
}

/** Whether a key's target is in this toolbar's own DOM, not a nested toolbar's and not a popup's (which reaches React's tree, not this DOM). */
function ownedBy(root: HTMLElement, target: EventTarget): target is HTMLElement {
  return target instanceof HTMLElement && root.contains(target) && target.closest("[role=toolbar]") === root;
}

const plain = (event: React.KeyboardEvent) => !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);

/**
 * A group of controls with one tab stop. Name it with `aria-label` or `aria-labelledby`. It draws nothing: lay it out with your own
 * class. Its controls are `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink` and `ToolbarInput`.
 */
export function Toolbar({ orientation = "horizontal", loopFocus = true, onKeyDown, onKeyDownCapture, ...props }: ToolbarProps) {
  const [direction, setDirection] = React.useState<"ltr" | "rtl">("ltr");
  return (
    <DirectionProvider direction={direction}>
      <BaseToolbar.Root
        {...props}
        orientation={orientation}
        loopFocus={loopFocus}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);
          const root = event.currentTarget;
          // The direction for a key is the direction drawn when it is pressed (the page's can change while focus stays inside), so it is
          // read now and, if it moved, applied before the toolbar's own handler runs.
          const drawn = getComputedStyle(root).direction === "rtl" ? "rtl" : "ltr";
          if (drawn !== direction) flushSync(() => setDirection(drawn));
          // A menu button opens its menu on Down and on Up, which are a vertical toolbar's own keys: the toolbar goes first, so the
          // two walk past it as they do past any other control. Enter, Space and a click still open it. Only this toolbar's own
          // controls: not a nested toolbar's, and not a popup's that reaches here through React's tree.
          const target = event.target;
          if (event.defaultPrevented || orientation !== "vertical" || (event.key !== "ArrowDown" && event.key !== "ArrowUp") || !plain(event)) return;
          if (!ownedBy(root, target) || target.getAttribute("aria-haspopup") !== "menu" || !target.hasAttribute("data-basalt-toolbar-item")) return;
          const controls = controlsOf(root);
          const next = controls.indexOf(target) + (event.key === "ArrowDown" ? 1 : -1);
          event.preventDefault();
          event.stopPropagation();
          (controls[next] ?? (loopFocus ? controls[(next + controls.length) % controls.length] : undefined))?.focus();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          const root = event.currentTarget;
          // Every key is this toolbar's only when its target is one of its own: Base UI's arrow handling, which runs after this, is
          // told to leave the rest alone (a nested toolbar's control, or a popup's or portal's that reaches here through React's tree).
          if (!ownedBy(root, event.target)) {
            (event as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
            return;
          }
          if (event.defaultPrevented || (event.key !== "Home" && event.key !== "End") || !plain(event)) return;
          // In a text field Home and End are the caret's.
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
          const controls = controlsOf(root);
          const target = event.key === "Home" ? controls[0] : controls[controls.length - 1];
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      />
    </DirectionProvider>
  );
}

export interface ToolbarGroupProps extends PartProps<"div"> {
  /** Disable every button and input in the group. A `ToolbarLink` is not disabled by it (Base UI's links have no disabled state). */
  disabled?: boolean;
}

/** Related controls inside a toolbar. It draws nothing. Name it with `aria-label` when it is more than layout. */
export function ToolbarGroup(props: ToolbarGroupProps) {
  return <BaseToolbar.Group {...props} />;
}

export type ToolbarSeparatorProps = PartProps<"div">;

/** A separator between controls, for assistive technology. It draws nothing; give it a class to draw one. */
export function ToolbarSeparator(props: ToolbarSeparatorProps) {
  return <BaseToolbar.Separator {...props} />;
}

/** The part of a toolbar item's props that is the toolbar's: whether a disabled control keeps its place in the arrow order. */
interface ToolbarItemProps {
  /** Disabled controls stay in the arrow order and can take focus, so a keyboard user finds them and reads why. On by default. Off takes them out of it. */
  focusableWhenDisabled?: boolean;
}

export type ToolbarButtonProps = Omit<ButtonProps, "render" | "nativeButton" | "focusableWhenDisabled"> & ToolbarItemProps;

/**
 * A Basalt `Button` as a toolbar control. It is the same Button (every prop and every look), with a place in the toolbar's arrow
 * keys. To open a menu or popover from it, make it the trigger's `render`: `<MenuTrigger render={<ToolbarButton>Format</ToolbarButton>} />`.
 */
export function ToolbarButton({ focusableWhenDisabled = true, disabled, ...props }: ToolbarButtonProps) {
  return <BaseToolbar.Button disabled={disabled} focusableWhenDisabled={focusableWhenDisabled} render={<Button {...(props as ButtonProps)} {...ITEM} focusableWhenDisabled={focusableWhenDisabled} />} />;
}

export type ToolbarIconButtonProps = Omit<IconButtonProps, "render" | "nativeButton" | "focusableWhenDisabled"> & ToolbarItemProps;

/** A Basalt `IconButton` as a toolbar control: the same IconButton, with a place in the toolbar's arrow keys. */
export function ToolbarIconButton({ focusableWhenDisabled = true, disabled, ...props }: ToolbarIconButtonProps) {
  return <BaseToolbar.Button disabled={disabled} focusableWhenDisabled={focusableWhenDisabled} render={<IconButton {...(props as IconButtonProps)} {...ITEM} focusableWhenDisabled={focusableWhenDisabled} />} />;
}

/** A Basalt `Link` as a toolbar control: the same Link, with a place in the toolbar's arrow keys. */
export function ToolbarLink(props: LinkProps) {
  return <BaseToolbar.Link render={<Link {...props} {...ITEM} />} />;
}

export type ToolbarInputProps = Omit<InputProps, "render"> & ToolbarItemProps;

/** A Basalt `Input` as a toolbar control: the same Input, with a place in the toolbar's arrow keys. */
export function ToolbarInput({ focusableWhenDisabled = true, disabled, ...props }: ToolbarInputProps) {
  return <BaseToolbar.Input disabled={disabled} focusableWhenDisabled={focusableWhenDisabled} render={<Input {...props} {...ITEM} />} />;
}
