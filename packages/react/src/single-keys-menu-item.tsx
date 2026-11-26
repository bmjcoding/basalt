import * as React from "react";

import { MenuCheckboxItem } from "./menu";
import { useSingleKeys } from "./shortcuts";

export interface SingleKeysMenuItemProps {
  className?: string;
}

/**
 * Single-key shortcuts as a `Menu` row: "Single-key shortcuts", checked while on, one line, on the shipped store (`useSingleKeys`), so it and a
 * `SingleKeysSwitch` on one page stay in step. One store write per activation; the menu stays open. In a menu, on is a check: never a `Switch`.
 */
export function SingleKeysMenuItem({ className }: SingleKeysMenuItemProps): React.JSX.Element {
  const { on, setOn } = useSingleKeys();
  return <MenuCheckboxItem className={className} checked={on} onCheckedChange={(next) => setOn(next)}>Single-key shortcuts</MenuCheckboxItem>;
}
