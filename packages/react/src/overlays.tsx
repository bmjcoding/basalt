import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { IconButton } from "./button";
import { CloseGlyph } from "./glyphs/close";
import { Dialog, DialogActions, DialogClose, DialogContent, DialogDescription, DialogModal, DialogTitle, DialogTrigger } from "./dialog";
import type { DialogCloseProps, DialogContentProps, DialogProps, DialogTriggerProps } from "./dialog";
import { inLevel, MODAL_LEVEL, ModalDepth, ModalHost, useModalLayer } from "./layers";
import { useModalOutside } from "./modal-outside";
import { FadePort, useScrollFade } from "./fade-port";
import { useScrollStop } from "./scroll-stop";
import type { Sides } from "./scroll-fade";
import type { PartProps } from "./types";
import { join, withClass, withStyle } from "./utils";
import { usePortalScope } from "./palette-scope";

export interface AlertDialogProps extends Omit<DialogProps, "modal" | "disablePointerDismissal"> {}

/** A dialog that asks for a decision. It ignores outside clicks, and focus starts on the safe choice. */
export function AlertDialog(props: AlertDialogProps) {
  return <BaseAlertDialog.Root {...props} />;
}
export { DialogTitle as AlertDialogTitle, DialogDescription as AlertDialogDescription, DialogActions as AlertDialogActions };

export function AlertDialogAction(props: DialogCloseProps) {
  return <BaseAlertDialog.Close {...props} />;
}

export function AlertDialogTrigger({ className, ...props }: DialogTriggerProps) {
  return <BaseAlertDialog.Trigger {...props} className={withClass("basalt-dialog-trigger", className)} />;
}

/** The safe action. It receives initial focus even when the destructive action appears first. */
export function AlertDialogCancel(props: DialogCloseProps) {
  return <BaseAlertDialog.Close {...props} data-basalt-cancel="" />;
}

export function AlertDialogContent({ className, initialFocus, ref, style, children, ...props }: DialogContentProps) {
  const portalScope = usePortalScope();
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement | null>(null);
  const keepRef = React.useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  const mergedRef = useModalOutside<HTMLDivElement>(keepRef);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <ModalHost.Provider value={popup}>
    <BaseAlertDialog.Portal {...portalScope}>
      <BaseAlertDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseAlertDialog.Popup {...props} data-level={MODAL_LEVEL} ref={mergedRef} style={withStyle({ zIndex: layer.popup }, style)} initialFocus={initialFocus ?? (() => popup.current?.querySelector<HTMLElement>("[data-basalt-cancel]") ?? true)} className={withClass("basalt-dialog", className)}><FadePort className="basalt-dialog-scroll" labelledBy={dialogTitle}>{inLevel(MODAL_LEVEL, children)}</FadePort></BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
    </ModalHost.Provider>
    </ModalDepth.Provider>
  );
}

/**
 * Where a sheet comes from. `top` is the site header's narrow menu: it covers the bar, which it redraws in its first row, and
 * the list unrolls beneath it from the bar's edge (a clip, not a slide), with the scrim, level 1, `shadow-modal` and bottom
 * corners of 16. It is as tall as its content and scrolls inside at the viewport's height.
 */
export type SheetSide = "left" | "right" | "bottom" | "top";
export interface SheetContentProps extends Omit<DialogContentProps, "size"> {
  side?: SheetSide;
  /**
   * Which step the sheet shows, for a sheet that swaps its body in place (a cart, then its summary). When it changes, focus goes to
   * the sheet's title (not the first control, and not by a document-wide query), so the new title is read out, and the body scrolls
   * back to its top. The first value is not a change. The app swaps the body and the foot; the sheet moves focus.
   */
  step?: string | number;
  /**
   * A side sheet's width. `wide` (`size-sheet-width-wide`, 720px; at most the window less `space-12` from 720, so a strip of scrim stays to press; the
   * window's width under 720) holds a record the reader reads while the list stays behind it: its body (680) clears `size-breakpoint-container-lg`, so
   * the parts inside draw their wide forms. Its title is the page's step, 18/26 (the standard sheet and the form dialog keep 20/28), and its first focus
   * is the title, as a wide dialog's is; `initialFocus` wins. A form stays a form dialog; a whole workspace stays a page. Ignored on `top` and `bottom`.
   */
  size?: "default" | "wide";
}

export { Dialog as Sheet, DialogTrigger as SheetTrigger, DialogTitle as SheetTitle, DialogDescription as SheetDescription, DialogClose as SheetClose, DialogActions as SheetActions };

/** The name of a port that is a keyboard stop of its own: its dialog's title. */
const dialogTitle = (box: HTMLElement) => box.closest('[role="dialog"], [role="alertdialog"]')?.getAttribute("aria-labelledby") ?? undefined;

/**
 * The opaque strip a sheet with no `SheetBody` holds at its port's foot (cimip-gaps-3 t7): its sticky actions' drawn band, the box less the space-1-5 it
 * clips from its own top, so the bottom fade ends on their divider and the actions keep full paint.
 */
function heldActions(port: HTMLElement): Sides {
  const actions = port.querySelector<HTMLElement>(":scope > .basalt-dialog-actions, :scope > .basalt-form > .basalt-dialog-actions");
  if (!actions) return {};
  const clip = /inset\(\s*([\d.]+)px/.exec(getComputedStyle(actions).clipPath);
  const top = actions.getBoundingClientRect().top + (clip ? parseFloat(clip[1]!) : 0);
  const bottom = port.getBoundingClientRect().bottom;
  return { bottom: Math.max(0, Math.min(bottom - top, actions.offsetHeight)) };
}

/** A modal side panel for a task or detail, with native dialog focus and dismissal behaviour. */
export function SheetContent({ side = "right", className, style, children, ref, step, size = "default", initialFocus, ...props }: SheetContentProps) {
  const portalScope = usePortalScope();
  const wide = size === "wide" && (side === "left" || side === "right");
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement | null>(null);
  const keepRef = React.useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  const popupRef = useModalOutside<HTMLDivElement>(keepRef, React.useContext(DialogModal));
  const shown = React.useRef(step);
  React.useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    const sheet = popup.current;
    if (!sheet) return;
    sheet.querySelector<HTMLElement>(".basalt-sheet-body")?.scrollTo?.(0, 0);
    sheet.querySelector<HTMLElement>(".basalt-dialog-title")?.focus({ preventScroll: true });
  }, [step]);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <ModalHost.Provider value={popup}>
    <BaseDialog.Portal {...portalScope}>
      <BaseDialog.Backdrop data-side={side} className="basalt-dialog-backdrop basalt-sheet-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} ref={popupRef} data-side={side} data-size={wide ? "wide" : undefined} initialFocus={initialFocus ?? (wide ? () => popup.current?.querySelector<HTMLElement>(".basalt-dialog-title") ?? true : undefined)} data-level={MODAL_LEVEL} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-sheet", className)}><FadePort className="basalt-sheet-scroll" pinned={heldActions} labelledBy={dialogTitle}>{inLevel(MODAL_LEVEL, children)}</FadePort></BaseDialog.Popup>
    </BaseDialog.Portal>
    </ModalHost.Provider>
    </ModalDepth.Provider>
  );
}

export interface SheetHeaderProps extends React.ComponentProps<"header"> {
  /** The close button's name ("Close cart"). Give it and the head draws a 44px close at its end; leave it out and there is none. */
  closeLabel?: string;
}

/**
 * The sheet's head band: its `SheetTitle` (20/28, 600) and, under it, a `SheetDescription` (a count, 13/18, tertiary), with a close
 * button at the end. A hairline `border-divider` runs under it. It keeps the top and the inline-end safe areas. A sheet that has a
 * head, a body and a foot has no padding of its own: the three bands are edge to edge.
 */
export function SheetHeader({ closeLabel, className, children, ...props }: SheetHeaderProps) {
  return (
    <header {...props} className={join("basalt-sheet-head", className)}>
      <div className="basalt-sheet-head-text">{children}</div>
      {closeLabel ? <DialogClose render={<IconButton icon={CloseGlyph} label={closeLabel} edge="end" className="basalt-sheet-close" />} /> : null}
    </header>
  );
}

/**
 * The part of a sheet that scrolls, between its head and its foot. A body that overflows and holds nothing focusable is a keyboard stop of its
 * own, a region named by the sheet's title (or by your own `aria-label`) with Basalt's ring, so a keyboard can scroll it (WCAG 2.1.1); when it
 * fits, or holds a control, nothing changes. There is no `tabIndex` to add.
 */
export function SheetBody({ className, ref, ...props }: React.ComponentProps<"div">) {
  const named = Boolean(props["aria-label"] || props["aria-labelledby"]);
  // The body stays the port (its class, ref, props, stop and name) and fades at each edge that hides more (cimip-gaps-3 t7); a host round it takes its place
  // in the column and draws its ring at -2, since a mask erases the port's own outline.
  const port = React.useRef<HTMLDivElement | null>(null);
  const keep = React.useCallback((node: HTMLDivElement | null) => {
    port.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [ref]);
  const body = useScrollStop<HTMLDivElement>({ named, labelledBy: (box) => box.closest('[role="dialog"]')?.getAttribute("aria-labelledby") ?? undefined }, keep);
  useScrollFade(port, { axis: "block", ring: 4 });
  return (
    <div className="basalt-sheet-body-host">
      <div {...body.attributes} {...props} ref={body.ref} className={join("basalt-sheet-body", className)} />
    </div>
  );
}

/** The foot band, fixed under the body on a divider, whatever the body's length. It keeps the bottom safe area. */
export function SheetFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return <footer {...props} className={join("basalt-sheet-foot", className)} />;
}
