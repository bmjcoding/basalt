import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command } from "cmdk";
import * as React from "react";

import { Kbd } from "./display";
import { Icon } from "./icon";

export interface CommandItem {
  id: string;
  label: string;
  icon?: PhosphorIcon;
  shortcut?: string;
  /** Extra words that should find this command, e.g. ["remove"] for "Delete sandbox". */
  keywords?: string[];
  /** A destructive command: shown in the danger colour, as in `Menu`. */
  danger?: boolean;
  onSelect: () => void;
}

export interface CommandGroup {
  label: string;
  commands: CommandItem[];
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  /** Show a footer naming the keys (↵ Run, Esc Close). Off by default: they're universal. */
  hints?: boolean;
}

/**
 * A searchable list of every action, opened with ⌘K. Type to filter, arrows to move,
 * Enter to run, Esc to close. Bind the shortcut in the app; this component is the dialog.
 * Filtering and keyboard selection come from cmdk (MIT).
 */
export function CommandMenu({ open, onOpenChange, groups, placeholder = "Search commands", hints = false }: CommandMenuProps) {
  const hintId = React.useId();
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="basalt-dialog-backdrop" />
        <BaseDialog.Popup className="basalt-dialog basalt-command" aria-label="Command menu">
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
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export type { CommandItem as Command };
