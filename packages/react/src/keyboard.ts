import * as React from "react";

import { isApplePlatform } from "./platform";

// On a touch device with no keyboard, a shortcut chip is noise: nothing there can press it. The CSS hides
// the chips (`data-shortcut`) and their hint legends (`data-kbd-hint`) on `(hover: none) and (pointer:
// coarse)` until `<html data-keyboard="hardware">` is set. This sets it, once a key a physical keyboard
// sends has been pressed, and remembers it for the tab's session. Nothing here runs at import: the listener
// is installed by the first component that renders a shortcut chip.

const KEY = "basalt-keyboard";
const TOUCH = "(hover: none) and (pointer: coarse)";
// Allocated by the first subscription, never at import.
let subscribers: Set<() => void> | undefined;
let installed = false;
let hardware = false;

/**
 * Tab and Escape, or any key with Command, Control or Alt held. Never Shift alone, an arrow, or a key a soft keyboard
 * or an input method sends: "Unidentified", "Process" and "Dead", or anything while composing, even with a modifier held.
 */
export function isHardwareKey(event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey"> & { isComposing?: boolean }): boolean {
  if (event.isComposing || event.key === "Unidentified" || event.key === "Process" || event.key === "Dead") return false;
  return event.key === "Tab" || event.key === "Escape" || event.metaKey || event.ctrlKey || event.altKey;
}

function reveal() {
  hardware = true;
  document.documentElement.dataset.keyboard = "hardware";
  try { sessionStorage.setItem(KEY, "hardware"); } catch { /* storage can be blocked; the page still reveals */ }
  document.removeEventListener("keydown", onKeyDown, { capture: true });
  for (const notify of subscribers ?? []) notify();
}

function onKeyDown(event: KeyboardEvent) {
  if (isHardwareKey(event)) reveal();
}

function install() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  try { hardware = sessionStorage.getItem(KEY) === "hardware"; } catch { hardware = false; }
  if (hardware) document.documentElement.dataset.keyboard = "hardware";
  else document.addEventListener("keydown", onKeyDown, { capture: true, passive: true });
}

function subscribe(notify: () => void) {
  install();
  (subscribers ??= new Set()).add(notify);
  const query = window.matchMedia(TOUCH);
  query.addEventListener("change", notify);
  return () => { subscribers?.delete(notify); query.removeEventListener("change", notify); };
}

function snapshot() {
  return !window.matchMedia(TOUCH).matches || hardware || document.documentElement.dataset.keyboard === "hardware";
}

/**
 * Whether shortcut chips show right now: always on a device that can hover or has a fine pointer, and on a
 * touch device only after a hardware key has been pressed. The first component to call it installs the one
 * passive, capture-phase `keydown` listener and restores the session's choice. True on the server.
 */
export function useShortcutsVisible(): boolean {
  return React.useSyncExternalStore(subscribe, snapshot, () => true);
}

// Nothing to subscribe to: the subscription's teardown is `no` too, which does nothing.
const no = () => false;

/**
 * Whether this machine is Apple's, so `Mod` is Command (`isApplePlatform`). It never changes, so nothing subscribes: a client render reads it at its first
 * render and is right at once. The server and the render that hydrates it answer "not Apple's" (Control), and the real answer arrives after mount with
 * no mismatch warning: a server-rendered page's `Mod` chips settle at hydration.
 */
export function useApplePlatform(): boolean {
  return React.useSyncExternalStore(() => no, isApplePlatform, no);
}
