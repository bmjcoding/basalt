// The cmdk-backed body of CommandMenu. A module of its own, so CommandMenu can import it on
// first open and an app that never opens one never downloads cmdk (and the Radix code under it).
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command } from "cmdk";
import * as React from "react";

import type { CommandGroup } from "./command";
import { Icon } from "./icon";
import { Kbd } from "./kbd";

export interface CommandPanelProps {
  groups: CommandGroup[];
  placeholder: string;
  hints: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPanel({ groups, placeholder, hints, onOpenChange }: CommandPanelProps) {
  const hintId = React.useId();
  return (
    <Command label="Command menu" loop>
      <div className="basalt-command-search">
        <Icon icon={MagnifyingGlassIcon} size={16} />
        <Command.Input className="basalt-command-input" placeholder={placeholder} aria-label={placeholder} aria-describedby={hints ? hintId : undefined} autoFocus />
      </div>
      <Command.List className="basalt-command-list" label="Commands">
        <Command.Empty className="basalt-command-empty">No commands match.</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
            {group.commands.map((command) => (
              <Command.Item
                key={command.id}
                value={`${command.label} ${command.id}`}
                keywords={command.keywords}
                data-danger={command.danger ? "" : undefined}
                className="basalt-menu-item"
                onSelect={() => {
                  onOpenChange(false);
                  command.onSelect();
                }}
              >
                {command.icon ? <Icon icon={command.icon} size={16} /> : null}
                <span className="basalt-menu-item-label">{command.label}</span>
                {command.shortcut ? <Kbd className="basalt-menu-item-shortcut">{command.shortcut}</Kbd> : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      {hints ? (
        <div className="basalt-command-footer" id={hintId}>
          <span><Kbd>↵</Kbd> Run</span>
          <span><Kbd>Esc</Kbd> Close</span>
        </div>
      ) : null}
    </Command>
  );
}
