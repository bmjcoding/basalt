// Two answers about popups. `isOverlayOpen`: is a dialog, an alert dialog, a sheet, a popover, the command menu or a menu open over the page and drawn
// (route focus waits for one, the focus net stands aside for one). `inOverlay`: is this node inside one (a page's single keys do not run from there). A
// toast is never one: it does not take the keys or the focus from the page. Nothing here runs at import.

const POPUP = '[role="dialog"], [role="alertdialog"], [role="menu"]';
const ALWAYS = 'dialog[open], [aria-modal="true"]';
// What holds its own keys: a dialog of any kind (an app's own non-modal one too), a menu, a listbox (a select's or a combobox's popup), a native dialog.
const KEYS_OWNER = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], dialog';

/** Drawn: not `display: none` (the `hidden` attribute, a closed popup's hidden positioner), not inert, and not a popup whose closing has finished. */
function drawn(element: Element): boolean {
  if (element.closest("[inert]")) return false;
  if (element.hasAttribute("data-closed") && !element.hasAttribute("data-ending-style")) return false;
  const check = (element as Element & { checkVisibility?: () => boolean }).checkVisibility;
  return typeof check === "function" ? check.call(element) : element.getClientRects().length > 0;
}

function counts(element: Element): boolean {
  if (element.closest(".basalt-toast, .basalt-toast-viewport")) return false;
  // A popup is in Base UI's portal; a role on an element in the page's flow (a menu drawn inline, a demo) is not over anything.
  if (!element.matches(ALWAYS) && element.closest("[data-base-ui-portal]") === null) return false;
  return drawn(element);
}

/**
 * Whether a dialog, an alert dialog, a sheet, a popover, the command menu or a menu is open over the page and drawn. A popup counts from the moment it is
 * drawn until it has gone, its closing animation included, so focus it hands back on closing comes while this is still true or just after. A popup that is
 * mounted but hidden (`hidden`, `display: none`, inert, or closed for good) does not count, and a toast never does.
 */
export function isOverlayOpen(doc: Document | undefined = typeof document === "undefined" ? undefined : document): boolean {
  if (!doc) return false;
  for (const element of doc.querySelectorAll(`${POPUP}, ${ALWAYS}`)) if (counts(element)) return true;
  return false;
}

/**
 * Whether `node` is inside something that owns its keys: a dialog or alert dialog (an app's own non-modal `role="dialog"` too, in a portal or not), a menu,
 * a listbox or a native `<dialog>`. A toast is a group, so a key pressed on one is not inside.
 */
export function inOverlay(node: EventTarget | null): boolean {
  return node instanceof Element && node.closest(KEYS_OWNER) !== null;
}
