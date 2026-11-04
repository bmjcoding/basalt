import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Kbd } from "./display";
import { Icon } from "./icon";

export interface Command {
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
  commands: Command[];
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  /** Show a footer naming the keys (↵ Run, Esc Close). Off by default: they're universal. */
  hints?: boolean;
}

const matches = (c: Command, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || [c.label, ...(c.keywords ?? [])].some((s) => s.toLowerCase().includes(q));
};

/**
 * A searchable list of every action, opened with ⌘K. Type to filter, arrows to move,
 * Enter to run, Esc to close. Bind the shortcut in the app; this component is the dialog.
 */
export function CommandMenu({ open, onOpenChange, groups, placeholder = "Search commands", hints = false }: CommandMenuProps) {
  const items = groups.map((g) => ({ value: g.label, items: g.commands }));
  const hintId = React.useId();
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="basalt-dialog-backdrop" />
        <BaseDialog.Popup className="basalt-dialog basalt-command" aria-label="Command menu">
          <Autocomplete.Root
            open
            inline
            items={items}
            autoHighlight="always"
            keepHighlight
            itemToStringValue={(c: Command) => c.label}
            filter={(c: Command, q: string) => matches(c, q)}
          >
            <div className="basalt-command-search">
              <Icon icon={MagnifyingGlassIcon} size={16} />
              <Autocomplete.Input className="basalt-command-input" placeholder={placeholder} aria-label={placeholder} aria-describedby={hints ? hintId : undefined} />
            </div>
            <Autocomplete.Empty className="basalt-command-empty">No commands match.</Autocomplete.Empty>
            <Autocomplete.List className="basalt-command-list">
              {(group: { value: string; items: Command[] }) => (
                <Autocomplete.Group key={group.value} items={group.items} className="basalt-command-group">
                  <Autocomplete.GroupLabel className="basalt-menu-group-label">{group.value}</Autocomplete.GroupLabel>
                  <Autocomplete.Collection>
                    {(c: Command) => (
                      <Autocomplete.Item
                        key={c.id}
                        value={c}
                        data-danger={c.danger ? "" : undefined}
                        className="basalt-menu-item"
                        onClick={() => {
                          onOpenChange(false);
                          c.onSelect();
                        }}
                      >
                        {c.icon ? <Icon icon={c.icon} size={16} /> : null}
                        <span className="basalt-menu-item-label">{c.label}</span>
                        {c.shortcut ? <Kbd className="basalt-menu-item-shortcut">{c.shortcut}</Kbd> : null}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.Collection>
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
            {hints ? (
              <div className="basalt-command-footer" id={hintId}>
                <span><Kbd>↵</Kbd> Run</span>
                <span><Kbd>Esc</Kbd> Close</span>
              </div>
            ) : null}
          </Autocomplete.Root>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
