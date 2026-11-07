import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Icon } from "./icon";
import { ModalDepth, useModalLayer } from "./layers";
import type { IconComponent } from "./types";

export interface CommandItem {
  id: string;
  label: string;
  icon?: IconComponent;
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

type PanelModule = typeof import("./command-panel");

// cmdk is the one large dependency here, so it arrives with the first opening, not with the import.
let panel: Promise<PanelModule> | undefined;

function loadPanel() {
  panel ??= import("./command-panel").catch((error) => {
    panel = undefined; // a failed load can be tried again on the next opening
    throw error;
  });
  return panel;
}

function usePanel(open: boolean) {
  const [loaded, setLoaded] = React.useState<PanelModule["CommandPanel"] | null>(null);
  React.useEffect(() => {
    if (!open || loaded) return;
    let live = true;
    loadPanel().then((module) => { if (live) setLoaded(() => module.CommandPanel); }, () => {});
    return () => { live = false; };
  }, [open, loaded]);
  return loaded;
}

/**
 * A searchable list of every action, opened with ⌘K. Type to filter, arrows to move,
 * Enter to run, Esc to close. Bind the shortcut in the app; this component is the dialog.
 * Filtering and keyboard selection come from cmdk (MIT), loaded the first time it opens.
 */
export function CommandMenu({ open, onOpenChange, groups, placeholder = "Search commands", hints = false }: CommandMenuProps) {
  const layer = useModalLayer();
  const Panel = usePanel(open);
  return (
    <ModalDepth.Provider value={layer.depth}>
      <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
          <BaseDialog.Popup className="basalt-dialog basalt-command" style={{ zIndex: layer.popup }} aria-label="Command menu">
            {Panel ? (
              <Panel groups={groups} placeholder={placeholder} hints={hints} onOpenChange={onOpenChange} />
            ) : (
              // the search row's height, held while the panel loads, so the dialog does not jump
              <div className="basalt-command-search" aria-hidden="true"><Icon icon={MagnifyingGlassIcon} size={16} /></div>
            )}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ModalDepth.Provider>
  );
}

export type { CommandItem as Command };
