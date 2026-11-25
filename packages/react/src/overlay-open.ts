// One answer to "is a dialog open": a dialog, an alert dialog, a sheet, a popover, the command menu or a menu that floats over the page (Base UI
// draws each in a portal), a native `<dialog open>`, or anything marked `aria-modal="true"`. A toast is never one: it does not take the
// keys or the focus from the page. Nothing here runs at import.

const POPUP = '[role="dialog"], [role="alertdialog"], [role="menu"]';
const ALWAYS = 'dialog[open], [aria-modal="true"]';

function counts(element: Element): boolean {
  if (element.closest(".basalt-toast, .basalt-toast-viewport, [hidden]")) return false;
  // A popup is in Base UI's portal; a role on an element in the page's flow (a menu drawn inline, a demo) is not over anything.
  return element.matches(ALWAYS) || element.closest("[data-base-ui-portal]") !== null;
}

/**
 * Whether a dialog, an alert dialog, a sheet, a popover, the command menu or a menu is open over the page. A popup counts from the moment it is
 * mounted until it has gone, its closing included, so focus it hands back on closing comes while this is still true or just after. A toast never
 * counts.
 */
export function isOverlayOpen(doc: Document | undefined = typeof document === "undefined" ? undefined : document): boolean {
  if (!doc) return false;
  for (const element of doc.querySelectorAll(`${POPUP}, ${ALWAYS}`)) if (counts(element)) return true;
  return false;
}
