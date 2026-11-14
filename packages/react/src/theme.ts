import * as React from "react";

// The theme's state for a React app, on the pattern of loops.ts: one attribute on the root (`<html data-theme="dark">`) that the
// tokens' stylesheet reads, a key in `localStorage`, and a hook. The key and its values are the HTML skill's (tools/html-skill/src/core.js:
// `basalt-theme`, `light` or `dark`), so a React app and a skill page on one origin agree: what one stores the other applies, and "no
// stored value" is the choice `system` in both. Nothing here runs at import: the listeners are installed by the first component that
// calls `useTheme` and removed with the last, and the store is allocated then.

const KEY = "basalt-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export type ThemeName = "light" | "dark";
/** What the person chose: a theme, or `system` (nothing stored: follow the device). */
export type ThemeChoice = ThemeName | "system";

// Allocated by the first subscription, never at import.
let subscribers: Set<() => void> | undefined;
let media: MediaQueryList | undefined;
// The choice made on this page, for when `localStorage` is blocked and cannot hold it. `undefined`: none made yet.
let session: ThemeChoice | undefined;

/**
 * A script for the document's head, so the theme applies before the first frame: the stored choice if there is one, else the
 * system's, written to `data-theme` exactly as the HTML skill's head snippet does. The app inlines it:
 * `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`.
 */
export const themeBootstrap = `(function(){var t;try{t=localStorage.getItem("${KEY}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);})();`;

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    // Storage can be blocked: the choice made on this page stands for it.
    return session ?? "system";
  }
}

const systemTheme = (): ThemeName => (typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light");

function resolve(choice: ThemeChoice): ThemeName {
  return choice === "system" ? systemTheme() : choice;
}

/** Writes the resolved theme to the root, as the skill's `initTheme` does; a `system` choice is written as what the system is now. */
function write() {
  const theme = resolve(readChoice());
  const root = document.documentElement;
  if (root.getAttribute("data-theme") !== theme) root.setAttribute("data-theme", theme);
}

function change() {
  write();
  for (const notify of subscribers ?? []) notify();
}

function onStorage(event: StorageEvent) {
  // A null key is `localStorage.clear()`, which also removes the choice.
  if (event.key !== null && event.key !== KEY) return;
  change();
}

function install() {
  write();
  window.addEventListener("storage", onStorage);
  if (typeof window.matchMedia === "function") {
    media = window.matchMedia(DARK_QUERY);
    media.addEventListener("change", change);
  }
}

function uninstall() {
  window.removeEventListener("storage", onStorage);
  media?.removeEventListener("change", change);
  media = undefined;
}

function subscribe(notify: () => void) {
  if (typeof document === "undefined") return () => {};
  const set = (subscribers ??= new Set());
  if (set.size === 0) install();
  set.add(notify);
  return () => {
    set.delete(notify);
    if (set.size === 0) uninstall();
  };
}

function setChoice(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  if (choice !== "light" && choice !== "dark" && choice !== "system") return;
  session = choice;
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch { /* storage can be blocked; the choice then lasts for this page */ }
  change();
}

// What the store holds, as one string so React can compare it: theme, choice. The server's carries a third part.
const SERVER = "light:system:server";
const snapshot = () => {
  const choice = readChoice();
  return `${resolve(choice)}:${choice}`;
};

export interface ThemeState {
  /** The theme in use: `light` or `dark`. */
  theme: ThemeName;
  /** What the person chose: `light`, `dark`, or `system` (no stored value). */
  choice: ThemeChoice;
  /** Chooses a theme, or `system` to follow the device. Stored for this app's origin in this browser; every tab follows. */
  setChoice: (choice: ThemeChoice) => void;
  /** False until the client has read the page: on the server and while it hydrates. */
  ready: boolean;
}

/**
 * The page's theme. `theme` is what the stylesheet is showing, `choice` is what was asked for (`system` when nothing is stored),
 * and `setChoice` changes it and writes `data-theme` on `<html>`. While the choice is `system` the theme follows the device's
 * scheme as it changes, and a change made in another tab arrives by the `storage` event. On the server, and on the first client
 * render of a hydrating page, it returns `{ theme: "light", choice: "system", ready: false }` (the stylesheet's own default
 * before any `data-theme`), so what is drawn first is the same on both; the real answer follows at once. Use `ready` to hold
 * back a control that would flash the wrong choice. Nothing is announced when it changes: the control that sets it says its own state.
 */
export function useTheme(): ThemeState {
  const value = React.useSyncExternalStore(subscribe, snapshot, () => SERVER);
  return React.useMemo(() => {
    const [theme, choice, server] = value.split(":") as [ThemeName, ThemeChoice, string | undefined];
    return { theme, choice, setChoice, ready: server === undefined };
  }, [value]);
}
