import * as React from "react";

// While a modal is open, the page behind it is hidden from assistive technology: Base UI sets `aria-hidden` on what is outside, and
// skips every element that holds an `aria-live` node (a `TextMorph`, an app's own status text) so that live announcements still
// reach the user. The skip also leaves any control that holds one, and the path to it, in the accessibility tree, where a screen
// reader's cursor can land on the button and press it with the modal still open. A modal has nothing outside it that may be
// operated, so those controls are made inert: out of the tree and the tab order, with no change to what is drawn. Live regions that
// are not inside a control keep announcing, and so does the toast stack.

const CONTROLS = [
  "a[href]", "button", "input:not([type='hidden'])", "select", "textarea", "summary", "[contenteditable='true']", "[tabindex]:not([tabindex='-1'])",
  "[role='button']", "[role='link']", "[role='checkbox']", "[role='switch']", "[role='radio']", "[role='tab']", "[role='slider']",
  "[role='combobox']", "[role='menuitem']", "[role='option']",
].join(",");

/** Makes inert every control outside `popup` that the modal left exposed. Returns the undo. */
export function inertOutside(popup: Element): () => void {
  const made: Element[] = [];
  // The modal's own portal holds what it opens from inside (a column explainer's card, written beside the popup so a transform on the popup
  // cannot move it): that is inside the modal, as Base UI counts it, and stays operable.
  const portal = popup.closest("[data-base-ui-portal]");
  for (const control of popup.ownerDocument.querySelectorAll(CONTROLS)) {
    if (popup.contains(control) || control.contains(popup) || portal?.contains(control)) continue;
    // Already out of the tree, or the toast stack, which stays operable above a modal (F6 reaches it).
    if (control.closest("[aria-hidden='true'], [inert], .basalt-toast-viewport")) continue;
    control.setAttribute("inert", "");
    made.push(control);
  }
  return () => { for (const control of made) control.removeAttribute("inert"); };
}

/**
 * `inertOutside`, kept true while the modal is open: a control that mounts later in the page outside it (a live region's new button) is made inert too.
 * Only what is added is looked at, and never what arrives in a portal (a modal or a menu opened above this one owns the keys) or the toast stack. Returns the undo.
 */
function guardOutside(popup: Element): () => void {
  const made: Element[] = [];
  const undo = inertOutside(popup);
  const added = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element) || popup.contains(node) || node.contains(popup)) continue;
      if (node.matches("[data-base-ui-portal]") || node.closest("[data-base-ui-portal], [aria-hidden='true'], [inert], .basalt-toast-viewport")) continue;
      for (const control of [...(node.matches(CONTROLS) ? [node] : []), ...node.querySelectorAll(CONTROLS)]) {
        if (control.closest("[data-base-ui-portal], [inert], .basalt-toast-viewport")) continue;
        control.setAttribute("inert", "");
        made.push(control);
      }
    }
  });
  added.observe(popup.ownerDocument.body, { childList: true, subtree: true });
  return () => { added.disconnect(); undo(); for (const control of made) control.removeAttribute("inert"); };
}

/**
 * A callback ref for a modal's popup (Dialog, AlertDialog, Sheet, CommandMenu): while the popup is mounted and `modal` is true, the controls
 * outside it that Base UI left exposed are inert. Pass the ref the caller gave the popup as `forwarded`, so it still receives the element.
 */
export function useModalOutside<T extends HTMLElement>(forwarded?: React.Ref<T> | undefined, modal = true) {
  const [popup, setPopup] = React.useState<T | null>(null);
  const undo = React.useRef<(() => void) | null>(null);
  // The popup whose guard the ref's cleanup just lifted. When the caller's ref changes, React detaches the old callback and attaches the new one to the same
  // popup in one commit: `popup` ends where it was, so the effect does not run again, and the new callback puts the guard back itself.
  const lifted = React.useRef<T | null>(null);
  const modalNow = React.useRef(modal);
  modalNow.current = modal;
  // After the commit that mounts the popup, so Base UI has done its own marking first.
  React.useEffect(() => {
    // A dialog that is not modal (`modal={false}` or `"trap-focus"`) leaves the page usable, so there is nothing to make inert.
    if (!popup || !modal) return undefined;
    undo.current = guardOutside(popup);
    return () => { undo.current?.(); undo.current = null; };
  }, [popup, modal]);
  return React.useCallback((node: T | null) => {
    if (!node) return undefined;
    if (lifted.current === node && modalNow.current && !undo.current) undo.current = guardOutside(node);
    lifted.current = null;
    setPopup(node);
    let cleanup: void | (() => void);
    if (typeof forwarded === "function") cleanup = forwarded(node);
    else if (forwarded) (forwarded as React.MutableRefObject<T | null>).current = node;
    return () => {
      // Lifted as the popup leaves, not a render later: the trigger gets focus back as it goes, and an inert one cannot take it.
      if (undo.current) lifted.current = node;
      undo.current?.();
      undo.current = null;
      setPopup(null);
      if (typeof cleanup === "function") cleanup();
      else if (typeof forwarded === "function") forwarded(null);
      else if (forwarded) (forwarded as React.MutableRefObject<T | null>).current = null;
    };
  }, [forwarded]);
}
