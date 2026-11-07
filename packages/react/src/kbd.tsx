import { CommandIcon, ControlIcon, OptionIcon } from "@phosphor-icons/react";
import type * as React from "react";

import { useShortcutsVisible } from "./keyboard";
import { shortcutKeys, spokenShortcut } from "./shortcut";
import { join } from "./utils";

// ⌘ ⌥ ⌃ have no glyph in Geist or Geist Mono, so they are Phosphor's Command, Option and Control.
// Every other key (letters, ⇧ ↵ ⌫ ⇥, arrows, "Esc") stays text in Geist Mono.
const MODIFIERS = { "⌘": CommandIcon, "⌥": OptionIcon, "⌃": ControlIcon } as const;

export interface KbdProps extends React.ComponentProps<"kbd"> {
  /**
   * Marks this chip as a shortcut the app binds (a trigger's chip, a legend): it is hidden on a touch
   * device until a hardware key is pressed. A bare `Kbd` in running text is documentation and always shows.
   */
  shortcut?: boolean;
}

/**
 * A key or a shortcut, e.g. "⌘K": one chip per key, a fill with no border. Written as a string it is
 * split into its keys and read out in words ("Command K"); a menu row passes `aria-hidden` and carries
 * the shortcut itself. Show real shortcuts only, one per row, never on the primary fill. Pass `shortcut`
 * when the chip stands for a key the app binds, so touch devices without a keyboard don't show it.
 */
export function Kbd({ className, children, shortcut, ...props }: KbdProps) {
  if (shortcut) return <ShortcutChip {...props} className={className}>{children}</ShortcutChip>;
  return <Chip {...props} className={className}>{children}</Chip>;
}

// A separate component, so a bare Kbd never installs the reveal listener.
function ShortcutChip(props: React.ComponentProps<"kbd">) {
  useShortcutsVisible();
  return <Chip {...props} data-shortcut="" />;
}

function Chip({ className, children, ...props }: React.ComponentProps<"kbd">) {
  if (typeof children !== "string") {
    return (
      <kbd {...props} className={join("basalt-kbd", className)}>
        <kbd className="basalt-kbd-key">{children}</kbd>
      </kbd>
    );
  }
  const keys = shortcutKeys(children);
  return (
    <kbd {...props} className={join("basalt-kbd", className)}>
      <span className="basalt-visually-hidden">{spokenShortcut(keys)}</span>
      {keys.map((key, index) => {
        const Glyph = MODIFIERS[key as keyof typeof MODIFIERS];
        return (
          <kbd key={index} className="basalt-kbd-key" aria-hidden="true">
            {Glyph ? <Glyph size={12} weight="bold" className="basalt-icon" aria-hidden="true" focusable="false" /> : key}
          </kbd>
        );
      })}
    </kbd>
  );
}
