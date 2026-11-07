import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button } from "./button";
import { Icon } from "./icon";
import { inLevel, ModalDepth, useModalLayer } from "./layers";
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
  // A rejected promise is never kept, so every attempt asks for the chunk again.
  panel ??= import("./command-panel").catch((error) => {
    panel = undefined;
    throw error;
  });
  return panel;
}

type PanelState = { status: "loading" } | { status: "error"; failures: number } | { status: "ready"; Panel: PanelModule["CommandPanel"] };
const LOADING: PanelState = { status: "loading" };

/** The panel once it has loaded; `loading` or `error` until then. Opening again, or `retry`, asks for the chunk again after a failure. */
function usePanel(open: boolean) {
  const [state, setState] = React.useState<PanelState>(LOADING);
  const [attempt, setAttempt] = React.useState(0);
  const ready = state.status === "ready";
  const failures = React.useRef(0);
  React.useEffect(() => {
    if (!open || ready) return;
    let live = true;
    setState(LOADING);
    loadPanel().then(
      (module) => {
        failures.current = 0;
        if (live) setState({ status: "ready", Panel: module.CommandPanel });
      },
      () => {
        failures.current += 1;
        if (live) setState({ status: "error", failures: failures.current });
      },
    );
    return () => { live = false; };
  }, [open, ready, attempt]);
  const retry = React.useCallback(() => setAttempt((count) => count + 1), []);
  return { state, retry };
}

/**
 * A searchable list of every action, opened with ⌘K. Type to filter, arrows to move,
 * Enter to run, Esc to close. Bind the shortcut in the app; this component is the dialog.
 * Filtering and keyboard selection come from cmdk (MIT), loaded the first time it opens.
 */
export function CommandMenu({ open, onOpenChange, groups, placeholder = "Search commands", hints = false }: CommandMenuProps) {
  const layer = useModalLayer();
  const { state, retry } = usePanel(open);
  const popup = React.useRef<HTMLDivElement>(null);
  const Panel = state.status === "ready" ? state.Panel : null;
  return (
    <ModalDepth.Provider value={layer.depth}>
      <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="basalt-dialog-backdrop basalt-command-backdrop" style={{ zIndex: layer.backdrop }} />
          <BaseDialog.Popup ref={popup} className="basalt-dialog basalt-command" data-level={2} style={{ zIndex: layer.popup }} aria-label="Command menu" aria-busy={Panel ? undefined : state.status === "loading"}>
            {inLevel(
              2,
              Panel ? (
                <Panel groups={groups} placeholder={placeholder} hints={hints} onOpenChange={onOpenChange} />
              ) : state.status === "error" ? (
                <div className="basalt-command-error" role="alert">
                  <p className="basalt-command-empty">
                    The command menu could not be loaded.
                    {state.failures > 1 ? " A browser keeps a failed file for the life of the page, so reloading may be the only way to fetch it again." : null}
                  </p>
                  <div className="basalt-command-error-actions">
                    <Button size="sm" autoFocus onClick={() => { popup.current?.focus(); retry(); }}>Retry</Button>
                    {state.failures > 1 ? <Button size="sm" onClick={() => window.location.reload()}>Reload page</Button> : null}
                    <BaseDialog.Close render={<Button size="sm" variant="ghost">Close</Button>} />
                  </div>
                </div>
              ) : (
                // the search row's height, held while the panel loads, so the dialog does not jump
                <div className="basalt-command-search" role="status">
                  <Icon icon={MagnifyingGlassIcon} size={16} />
                  <span className="basalt-visually-hidden">Loading commands</span>
                </div>
              ),
            )}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ModalDepth.Provider>
  );
}

export type { CommandItem as Command };
