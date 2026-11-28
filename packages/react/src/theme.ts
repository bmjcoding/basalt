import * as React from "react";

import { checkThemeColorOwners, syncThemeColor } from "./theme-color";
import { withoutTransitions } from "./theme-switch";

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

export { themeBootstrap } from "./theme-bootstrap";

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

/**
 * Writes the resolved theme to the root, as the skill's `initTheme` does; a `system` choice is written as what the system is now. It writes the
 * choice itself as `data-theme-choice` too: the theme choice draws its chosen word from that attribute. A write is ours, so the theme on the root is no
 * longer the app's own (`hand`). A change of theme is written inside the switch window, so colour changes at once and a movement already running keeps its time;
 * the choice and the browser chrome's colour follow, outside it (DECISIONS 420).
 */
function write() {
  const choice = readChoice();
  const theme = resolve(choice);
  const root = document.documentElement;
  if (root.getAttribute("data-theme") !== theme) {
    withoutTransitions(() => root.setAttribute("data-theme", theme));
    // Consume our own write, so the observer reports only what the app does.
    watch?.takeRecords();
  }
  hand = false;
  root.setAttribute("data-theme-choice", choice);
  syncThemeColor();
}

// Who wrote `data-theme`. A theme the app set by hand (an attribute it wrote after this took over, or a `.dark` or `.light` class root) is the app's: a change of the system's
// scheme does not overwrite it, even with nothing stored. It stays the app's until the reader picks a choice or another tab changes it (`write` is ours again), and it is
// the app's no longer once the app takes its attribute off. Allocated by the first subscription, never at import.
let watch: MutationObserver | undefined;
let hand = false;

function change(ours = true) {
  if (ours) write();
  for (const notify of subscribers ?? []) notify();
}

/** The system's scheme changed. System follows it, unless the root's theme is the app's own. */
function onSystem() {
  const root = document.documentElement;
  if (watch?.takeRecords().length) hand = root.hasAttribute("data-theme");
  change(!(readChoice() === "system" && (hand || root.matches(".dark,.light"))));
}

function onStorage(event: StorageEvent) {
  // A null key is `localStorage.clear()`, which also removes the choice.
  if (event.key === null || event.key === KEY) change();
}

function install() {
  checkThemeColorOwners();
  write();
  window.addEventListener("storage", onStorage);
  // The app's own data-theme write moves the browser chrome too.
  watch = new MutationObserver(() => { hand = document.documentElement.hasAttribute("data-theme"); syncThemeColor(); });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (typeof window.matchMedia === "function") {
    media = window.matchMedia(DARK_QUERY);
    media.addEventListener("change", onSystem);
  }
}

function uninstall() {
  window.removeEventListener("storage", onStorage);
  media?.removeEventListener("change", onSystem);
  media = undefined;
  watch?.disconnect();
  watch = undefined;
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
