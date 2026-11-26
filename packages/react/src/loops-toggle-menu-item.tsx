import * as React from "react";

import { LOOPS_TOGGLE_DESCRIPTION, LOOPS_TOGGLE_NAME } from "./constants";
import { useLoops } from "./loops";
import { MenuCheckboxItem } from "./menu";

export interface LoopsToggleMenuItemProps {
  /**
   * The second line: the switch form's ("Moving art and spinners hold still. Your work keeps running.") by default. It wraps, as a Menu's
   * descriptions do. A string replaces it; `false` gives one line.
   */
  description?: string | false;
  className?: string;
}

/**
 * The loop hold as a `Menu` row: "Pause animations", checked while held, on the shipped store (`useLoops`), so a menu row, a header icon and a
 * settings switch on one page stay in step. One store write per activation; the menu stays open, as a checkbox row's does. In a menu, on is a
 * check: never put a `Switch` in a menu. Its own module, so a page that draws the icon never loads the menu.
 */
export function LoopsToggleMenuItem({ description, className }: LoopsToggleMenuItemProps): React.JSX.Element {
  const { held, setHeld } = useLoops();
  return (
    <MenuCheckboxItem className={className} checked={held} onCheckedChange={(next) => setHeld(next)} description={description === false ? undefined : description ?? LOOPS_TOGGLE_DESCRIPTION}>
      {LOOPS_TOGGLE_NAME}
    </MenuCheckboxItem>
  );
}
