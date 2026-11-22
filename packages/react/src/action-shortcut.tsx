import * as React from "react";

import { useApplePlatform } from "./keyboard";
import { Kbd } from "./kbd";
import { ariaShortcut, shortcutKeys } from "./shortcut";
import { join } from "./utils";

export interface ActionShortcutProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The shortcut, as it is written: "⌘↵", or "Mod+Enter" for the platform's modifier (⌘ on Apple's systems, Ctrl elsewhere). One chip a key. */
  shortcut: string;
  /** The control it stands for: it takes `aria-keyshortcuts`. */
  children: React.ReactElement<{ "aria-keyshortcuts"?: string }>;
}

/**
 * A control with its shortcut shown beside it as a hint (DECISIONS 162, V11): the control keeps its own look (Send stays primary) and takes
 * `aria-keyshortcuts`; the chips stand next to it, outside the fill, hidden on a touch screen until a hardware key is pressed. Bind the key
 * yourself, and say it here only if it is real.
 */
export function ActionShortcut({ shortcut, children, className, ...props }: ActionShortcutProps) {
  const apple = useApplePlatform();
  return (
    <span {...props} className={join("basalt-action-shortcut", className)}>
      {React.cloneElement(children, { "aria-keyshortcuts": ariaShortcut(shortcutKeys(shortcut, apple)) })}
      <span className="basalt-action-shortcut-hint" data-kbd-hint="" aria-hidden="true"><Kbd shortcut aria-hidden="true">{shortcut}</Kbd></span>
    </span>
  );
}
