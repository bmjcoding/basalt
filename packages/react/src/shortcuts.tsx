import * as React from "react";

import { Switch } from "./choice";
import { Kbd } from "./kbd";
import { useApplePlatform } from "./keyboard";
import { ariaShortcut, shortcutKeys } from "./shortcut";
import { join } from "./utils";

// ---- Single-key shortcuts (DECISIONS 162, X11 and V12) ----
// An app-level hook that binds single keys, and the way to turn them off that WCAG 2.1.4 asks for: one stored choice, `basalt-keys`.
// Nothing here runs at import. The listener is installed by the first component that calls `useShortcuts`, and the choice is read
// when it is first asked for.

const KEY = "basalt-keys";
const OFF = "off";
let subscribers: Set<() => void> | undefined;
let installed = false;
let stored: boolean | undefined;

function read(): boolean {
  if (stored === undefined) {
    try { stored = localStorage.getItem(KEY) !== OFF; } catch { stored = true; }
  }
  return stored;
}

function change(on: boolean) {
  stored = on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, OFF);
  } catch { /* storage can be blocked; the choice then lasts for this page */ }
  for (const notify of subscribers ?? []) notify();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== KEY) return;
  stored = event.newValue !== OFF;
  for (const notify of subscribers ?? []) notify();
}

function subscribe(notify: () => void) {
  if (!installed && typeof window !== "undefined") { installed = true; window.addEventListener("storage", onStorage); }
  (subscribers ??= new Set()).add(notify);
  return () => { subscribers?.delete(notify); };
}

export interface SingleKeysState {
  /** Whether single-key shortcuts are on. True on the server and until the stored choice is read. */
  on: boolean;
  /** Turns every single-key shortcut on or off, for this app in this browser. */
  setOn: (on: boolean) => void;
}

/** The stored choice to have single-key shortcuts (`basalt-keys`): on by default, shared across the app's tabs. */
export function useSingleKeys(): SingleKeysState {
  const on = React.useSyncExternalStore(subscribe, read, () => true);
  return React.useMemo(() => ({ on, setOn: change }), [on]);
}

export interface ShortcutBinding {
  /** The key, as `KeyboardEvent.key` says it: "j", "G", "?", ":". Shift is part of the character, so "G" is Shift and g. */
  key: string;
  /** What it does, for the help list. */
  description: string;
  run: (event: KeyboardEvent) => void;
}

export interface UseShortcutsOptions {
  /** Binds nothing while false (a dialog is open, a command line has the keys). Default true. */
  enabled?: boolean;
}

export interface ShortcutsState {
  /** The bindings, in the order given, for a help dialog to draw (see `ShortcutList`). */
  shortcuts: readonly { keys: string; description: string }[];
  /** Whether single keys are on (the stored choice, `useSingleKeys`). */
  on: boolean;
  /** The props a control that runs a bound key carries: `aria-keyshortcuts`. */
  keyshortcuts: (key: string) => { "aria-keyshortcuts": string };
}

const EDITABLE = 'input, textarea, select, [role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"]';

/**
 * Binds single keys at the app level. A key with Command, Control or Alt held is not a single key and is left to the browser and to the
 * app's own shortcuts; a key typed in a field, and anything inside an element marked `data-own-keys` (a part that handles its own keys,
 * as a listbox does), is ignored too. While the stored choice is off (`useSingleKeys`) no key is bound, `?` included, so give the
 * help dialog a visible opener that is not a single key. Each bound control carries `aria-keyshortcuts` (`keyshortcuts(key)`).
 */
export function useShortcuts(bindings: readonly ShortcutBinding[], { enabled = true }: UseShortcutsOptions = {}): ShortcutsState {
  const { on } = useSingleKeys();
  const apple = useApplePlatform();
  const latest = React.useRef(bindings);
  latest.current = bindings;
  React.useEffect(() => {
    if (!enabled || !on) return;
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // `isContentEditable` is the element's real editing state: it covers `plaintext-only` and an editing state inherited from an ancestor.
      if (target?.closest(EDITABLE) || (target instanceof HTMLElement && target.isContentEditable) || target?.closest("[data-own-keys]")) return;
      const binding = latest.current.find((b) => b.key === event.key);
      if (!binding) return;
      event.preventDefault();
      binding.run(event);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [enabled, on]);
  const shortcuts = React.useMemo(() => bindings.map((b) => ({ keys: b.key, description: b.description })), [bindings]);
  return { shortcuts, on, keyshortcuts: (key) => ({ "aria-keyshortcuts": ariaShortcut(shortcutKeys(key, apple)) }) };
}

export interface SingleKeysSwitchProps {
  className?: string;
}

/** The "Single-key shortcuts" Switch for the help dialog (V12): the stored choice, on by default. */
export function SingleKeysSwitch({ className }: SingleKeysSwitchProps) {
  const { on, setOn } = useSingleKeys();
  return <Switch className={className} checked={on} onCheckedChange={setOn}>Single-key shortcuts</Switch>;
}

export interface ShortcutListProps extends Omit<React.ComponentProps<"dl">, "children"> {
  /** `ShortcutsState.shortcuts`. */
  shortcuts: readonly { keys: string; description: string }[];
}

/** The help list: each key is a chip beside what it does. A bare chip, because it is documentation, not a hint at a control. */
export function ShortcutList({ shortcuts, className, ...props }: ShortcutListProps) {
  return (
    <dl {...props} className={join("basalt-shortcut-list", className)}>
      {shortcuts.map((shortcut) => (
        <div key={shortcut.keys} className="basalt-shortcut-row">
          <dt className="basalt-shortcut-keys"><Kbd>{shortcut.keys}</Kbd></dt>
          <dd className="basalt-shortcut-what">{shortcut.description}</dd>
        </div>
      ))}
    </dl>
  );
}
