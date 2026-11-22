// The inside of a command row, shared by the cmdk-backed panel and by the static rows drawn while it loads, so a row is the
// same markup either way and nothing moves when cmdk arrives. No cmdk here: this module is part of the package's main graph.
import type * as React from "react";

import type { CommandItem } from "./command";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { Icon } from "./icon";
import { Kbd } from "./kbd";
import { useApplePlatform } from "./keyboard";
import { shortcutKeys, spokenShortcut } from "./shortcut";

/** What a row is matched on: its label and id. Its keywords and description are matched too, after them. */
export const commandValue = (command: CommandItem) => `${command.label} ${command.id}`;

/** The attributes that shape a row (the stylesheet reads them), whatever element draws it. */
export function commandRowShape(command: CommandItem) {
  return {
    "data-danger": command.danger ? "" : undefined,
    "data-described": command.description ? "" : undefined,
    "data-lead": command.icon ? "" : undefined,
  } as const;
}

/**
 * The row's content in reading order: glyph, label, description, shortcut. The stylesheet puts the glyph, the label and the
 * chip on the title line and the description under the label, so the DOM order is also the option's name: title, then description.
 * The chip is decoration; `spokenId` names the hidden words the row is described by. `chevron` draws the push's arrow, shown
 * only while a list with a preview is narrower than its split.
 */
export function CommandRowContent({ command, spokenId, chevron = false }: { command: CommandItem; spokenId: string; chevron?: boolean }): React.ReactElement {
  const apple = useApplePlatform();
  const keys = command.shortcut ? shortcutKeys(command.shortcut, apple) : [];
  return (
    <>
      {command.icon ? <Icon icon={command.icon} size={16} /> : null}
      <span className="basalt-menu-item-label">{command.label}</span>
      {command.description ? <span className="basalt-menu-item-description">{command.description}</span> : null}
      {command.shortcut ? (
        <>
          <Kbd shortcut aria-hidden="true" className="basalt-menu-item-shortcut">{command.shortcut}</Kbd>
          <span id={spokenId} hidden>{spokenShortcut(keys)}</span>
        </>
      ) : null}
      {chevron ? <Icon icon={ChevronRightGlyph} className="basalt-menu-item-chevron" /> : null}
    </>
  );
}

/**
 * The key legend at the foot of the list in the page: ↑↓ Move, ↵ Run (or Open beside a preview pane, where the list is 320 wide
 * and Esc is left to be found), Esc Clear. A hint, not a control: hidden from assistive technology, and from touch until a hardware key.
 */
export function CommandHints({ id, preview }: { id?: string; preview: boolean }): React.ReactElement {
  return (
    <span id={id} className="basalt-command-hints" data-kbd-hint="" aria-hidden="true">
      <span><span className="basalt-command-keys"><Kbd shortcut>↑</Kbd><Kbd shortcut>↓</Kbd></span> Move</span>
      <span><Kbd shortcut>↵</Kbd> {preview ? "Open" : "Run"}</span>
      {preview ? null : <span><Kbd shortcut>Esc</Kbd> Clear</span>}
    </span>
  );
}
