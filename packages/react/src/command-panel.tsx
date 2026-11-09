// The cmdk-backed body of CommandMenu. A module of its own, so CommandMenu can import it on
// first open and an app that never opens one never downloads cmdk (and the Radix code under it).
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command } from "cmdk";
import * as React from "react";

import type { CommandGroup } from "./command";
import { Icon } from "./icon";
import { BAND_LEVEL } from "./layers";
import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { ariaShortcut, shortcutKeys, spokenShortcut } from "./shortcut";

export interface CommandPanelProps {
  groups: CommandGroup[];
  placeholder: string;
  hints: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was typed into the placeholder search row while this panel loaded. */
  initialSearch?: string;
}

export function CommandPanel({ groups, placeholder, hints, onOpenChange, initialSearch = "" }: CommandPanelProps) {
  const hintId = React.useId();
  const [search, setSearch] = React.useState(initialSearch);
  // the footer is described to a screen reader only while it is drawn: hidden on a touch device with no keyboard
  const chipsShow = useShortcutsVisible();
  return (
    <Command label="Command menu" loop>
      <div className="basalt-command-search" data-level={BAND_LEVEL}>
        <Icon icon={MagnifyingGlassIcon} size={16} />
        <Command.Input className="basalt-command-input" placeholder={placeholder} aria-label={placeholder} aria-describedby={hints && chipsShow ? hintId : undefined} value={search} onValueChange={setSearch} autoFocus />
        <span className="basalt-command-slot" aria-hidden="true" />
      </div>
      <Command.List className="basalt-command-list" label="Commands">
        <Command.Empty className="basalt-command-empty">No commands match.</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
            {group.commands.map((command) => {
              const keys = command.shortcut ? shortcutKeys(command.shortcut) : [];
              const spoken = `${hintId}-${command.id}`;
              return (
                <Command.Item
                  key={command.id}
                  value={`${command.label} ${command.id}`}
                  keywords={command.keywords}
                  data-danger={command.danger ? "" : undefined}
                  aria-keyshortcuts={keys.length ? ariaShortcut(keys) : undefined}
                  aria-describedby={keys.length ? spoken : undefined}
                  className="basalt-menu-item"
                  onSelect={() => {
                    onOpenChange(false);
                    command.onSelect();
                  }}
                >
                  {command.icon ? <Icon icon={command.icon} size={16} /> : null}
                  <span className="basalt-menu-item-label">{command.label}</span>
                  {command.shortcut ? (
                    <>
                      <Kbd shortcut aria-hidden="true" className="basalt-menu-item-shortcut">{command.shortcut}</Kbd>
                      <span id={spoken} hidden>{spokenShortcut(keys)}</span>
                    </>
                  ) : null}
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
      {hints ? (
        <div className="basalt-command-footer" id={hintId} data-kbd-hint="">
          <span><Kbd shortcut>↵</Kbd> Run</span>
          <span><Kbd shortcut>Esc</Kbd> Close</span>
        </div>
      ) : null}
    </Command>
  );
}
