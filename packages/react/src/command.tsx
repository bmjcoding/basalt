import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button } from "./button";
import { Icon } from "./icon";
import { BAND_LEVEL, inLevel, MODAL_LEVEL, ModalDepth, useModalLayer } from "./layers";
import { Spinner } from "./spinner";
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

/** A load that finishes sooner than this shows no spinner at all: a flash of one is worse than none. */
const SPINNER_DELAY_MS = 300;

/** The loading ring, drawn only once the wait has run past `SPINNER_DELAY_MS`. Unmounts with the loading row, so every wait starts its own clock. */
function LoadingRing() {
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLate(true), SPINNER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return late ? <Spinner size={16} /> : null;
}

export type PanelState = { status: "loading" } | { status: "error"; failures: number } | { status: "ready"; Panel: PanelModule["CommandPanel"] };
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
      // An abandoned attempt (closed, or retried) owns nothing: it never touches the counter or the state, so a failure that
      // two subscriptions to one cached request both hear is counted once, by the one still live.
      (module) => {
        if (!live) return;
        failures.current = 0;
        setState({ status: "ready", Panel: module.CommandPanel });
      },
      () => {
        if (!live) return;
        failures.current += 1;
        setState({ status: "error", failures: failures.current });
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
export function CommandMenu(props: CommandMenuProps) {
  const { state, retry } = usePanel(props.open);
  return <CommandMenuShell {...props} state={state} retry={retry} />;
}

/**
 * The dialog around the panel, drawn for a given load state. Not exported from the package: `CommandMenu` passes the real
 * state, and the review walkthrough passes a fixed one to show the loading and error looks.
 * @internal
 */
export function CommandMenuShell({ open, onOpenChange, groups, placeholder = "Search commands", hints = false, state, retry }: CommandMenuProps & { state: PanelState; retry: () => void }) {
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement>(null);
  const loadingId = React.useId();
  // What is typed while the panel loads is kept, and becomes the panel's first search.
  const [early, setEarly] = React.useState("");
  React.useEffect(() => { if (!open) setEarly(""); }, [open]);
  const Panel = state.status === "ready" ? state.Panel : null;
  return (
    <ModalDepth.Provider value={layer.depth}>
      <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="basalt-dialog-backdrop basalt-command-backdrop" style={{ zIndex: layer.backdrop }} />
          <BaseDialog.Popup ref={popup} className="basalt-dialog basalt-command" data-level={MODAL_LEVEL} style={{ zIndex: layer.popup }} aria-label="Command menu">
            {inLevel(
              MODAL_LEVEL,
              Panel ? (
                <Panel groups={groups} placeholder={placeholder} hints={hints} onOpenChange={onOpenChange} initialSearch={early} />
              ) : state.status === "error" ? (
                // The alert is the sentence alone: the buttons are not read out with it. A browser keeps a failed
                // file for the life of the page, so after a second failure Reload page comes first and has focus.
                <div className="basalt-command-error">
                  <p className="basalt-command-empty" role="alert">
                    {state.failures > 1 ? "Still couldn't load commands. Reloading the page usually fixes this." : "Couldn't load commands."}
                  </p>
                  <div className="basalt-command-error-actions">
                    {state.failures > 1 ? <Button size="sm" autoFocus onClick={() => window.location.reload()}>Reload page</Button> : null}
                    <Button size="sm" autoFocus={state.failures <= 1} onClick={() => { popup.current?.focus(); retry(); }}>Retry</Button>
                    <BaseDialog.Close render={<Button size="sm" variant="ghost">Close</Button>} />
                  </div>
                </div>
              ) : (
                // The real search row while the panel loads: same height, same placeholder, focused, so typing is kept
                // and nothing jumps when the panel arrives. "Loading commands" is its description, not a live region. It has no
                // autoFocus: that would run before the dialog notes what to return focus to. The dialog focuses it.
                // The ring is for a wait that runs long: it sits in a slot at the row's end that the ready row also keeps
                // (empty), so the input is the same width before and after and nothing moves when loading ends.
                <div className="basalt-command-search" data-level={BAND_LEVEL}>
                  <Icon icon={MagnifyingGlassIcon} size={16} />
                  <input
                    className="basalt-command-input"
                    placeholder={placeholder}
                    aria-label={placeholder}
                    aria-describedby={loadingId}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={early}
                    onChange={(event) => setEarly(event.target.value)}
                  />
                  <span className="basalt-command-slot" aria-hidden="true"><LoadingRing /></span>
                  <span id={loadingId} className="basalt-visually-hidden">Loading commands</span>
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
