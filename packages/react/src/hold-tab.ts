import type * as React from "react";

// Base UI holds a modal's focus with a guard after the popup: Tab from the last control lands on the guard, and the guard sends focus back to the first
// control one frame later (`enqueueFocus`, a requestAnimationFrame). For that frame focus sits on a clipped span outside the dialog, and a Tab pressed in it
// goes to the page behind. A modal that must hold focus on the key itself (the narrow menu, which covers the bar its Menu button is in) does not wait for the guard:
// it wraps Tab at its own first and last control as the keydown happens, as the HTML skill's dialog does, and the guard stays a backstop.
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The controls inside `root` that Tab stops on, in order: the ones drawn, not inert or hidden from the accessibility tree (Base UI's focus guards are the latter). */
function stops(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.getClientRects().length > 0 && !node.closest("[hidden], [inert], [aria-hidden='true']"));
}

/**
 * A keydown handler for a modal popup: Tab from its last control goes to its first, Shift+Tab from its first goes to its last. Focus anywhere else, or in a popup
 * the modal opened in a portal (a menu from one of its tools), is left to the browser.
 */
export function holdTab(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const popup = event.currentTarget;
  const active = popup.ownerDocument.activeElement;
  if (!active || !popup.contains(active)) return;
  const all = stops(popup);
  const first = all[0];
  const last = all[all.length - 1];
  if (!first || !last) { event.preventDefault(); popup.focus(); return; }
  if (event.shiftKey && (active === first || active === popup)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
}
