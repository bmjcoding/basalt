// The inside of a command row, shared by the cmdk-backed panel and by the static rows drawn while it loads, so a row is the
// same markup either way and nothing moves when cmdk arrives. No cmdk here: this module is part of the package's main graph.
import type * as React from "react";

import type { CommandItem } from "./command";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { Icon } from "./icon";
import { Kbd } from "./kbd";
import { useApplePlatform } from "./keyboard";
import { markMatches, type MatchRange } from "./search-match";
import { shortcutKeys, spokenShortcut } from "./shortcut";

/** What a row is matched on: its label and id. Its keywords and description are matched too, after them. */
export const commandValue = (command: CommandItem) => `${command.label} ${command.id}`;

/** The attributes that shape a row (the stylesheet reads them), whatever element draws it. */
export function commandRowShape(command: CommandItem) {
  const unavailable = command.unavailable !== undefined;
  return {
    // Unavailable wins over danger: a row that cannot run is not drawn as one that would destroy.
    "data-danger": command.danger && !unavailable ? "" : undefined,
    "data-described": command.description || unavailable ? "" : undefined,
    "data-lead": command.icon ? "" : undefined,
    "data-unavailable": unavailable ? "" : undefined,
    // cmdk writes the state itself on its own rows (from `disabled`); the static rows drawn while it loads carry it here.
    "aria-disabled": unavailable ? "true" : undefined,
  } as const;
}

/** A string with the app's ranges marked, or the string as it is. */
const marked = (text: string, ranges: readonly MatchRange[] | undefined) => (ranges?.length ? markMatches(text, ranges) : text);

/**
 * The row's content in reading order: glyph, label, description, shortcut. The stylesheet puts the glyph, the label and the
 * chip on the title line and the description under the label, so the DOM order is also the option's name: title, then description.
 * The chip is decoration; `spokenId` names the hidden words the row is described by. `chevron` draws the push's arrow, shown
 * only while a list with a preview is narrower than its split.
 */
export function CommandRowContent({ command, spokenId, chevron = false }: { command: CommandItem; spokenId: string; chevron?: boolean }): React.ReactElement {
  const apple = useApplePlatform();
  const unavailable = command.unavailable !== undefined;
  // A row that cannot run has no key chip: its shortcut would run nothing.
  const shortcut = unavailable ? undefined : command.shortcut;
  const keys = shortcut ? shortcutKeys(shortcut, apple) : [];
  const matches = command.matches;
  return (
    <>
      {command.icon ? <Icon icon={command.icon} size={16} /> : null}
      <span className="basalt-menu-item-label">{marked(command.label, matches?.label)}</span>
      {unavailable ? (
        // The reason takes the second line (a description stays a search keyword) and wraps: it is the only statement of why, so it is never cut.
        <span className="basalt-menu-item-description basalt-command-reason">{marked(command.unavailable!, matches?.unavailable)}</span>
      ) : command.description ? (
        <span className="basalt-menu-item-description">{marked(command.description, matches?.description)}</span>
      ) : null}
      {shortcut ? (
        <>
          <Kbd shortcut aria-hidden="true" className="basalt-menu-item-shortcut">{shortcut}</Kbd>
          <span id={spokenId} hidden>{spokenShortcut(keys)}</span>
        </>
      ) : null}
      {chevron ? <Icon icon={ChevronRightGlyph} className="basalt-menu-item-chevron" /> : null}
    </>
  );
}

/**
 * The key legend at the foot's end. In the list in the page: ↑↓ Move, ↵ Run (or Open beside a preview pane, where the list is 320 wide
 * and Esc is left to be found), Esc Clear. In the modal (`modal`): ↵ Run, Esc Close. A hint, not a control: hidden from assistive technology,
 * and from touch until a hardware key.
 */
export function CommandHints({ id, preview, modal = false }: { id?: string; preview: boolean; modal?: boolean }): React.ReactElement {
  if (modal) {
    return (
      <span id={id} className="basalt-command-hints" data-kbd-hint="" aria-hidden="true">
        <span><Kbd shortcut>↵</Kbd> Run</span>
        <span><Kbd shortcut>Esc</Kbd> Close</span>
      </span>
    );
  }
  return (
    <span id={id} className="basalt-command-hints" data-kbd-hint="" aria-hidden="true">
      <span><span className="basalt-command-keys"><Kbd shortcut>↑</Kbd><Kbd shortcut>↓</Kbd></span> Move</span>
      <span><Kbd shortcut>↵</Kbd> {preview ? "Open" : "Run"}</span>
      {preview ? null : <span><Kbd shortcut>Esc</Kbd> Clear</span>}
    </span>
  );
}
