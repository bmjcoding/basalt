import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { Dialog, DialogActions, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import type { DialogCloseProps, DialogContentProps, DialogProps, DialogTriggerProps } from "./dialog";
import { inLevel, ModalDepth, useModalLayer } from "./layers";
import type { PartProps } from "./types";
import { withClass, withStyle } from "./utils";

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
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseAlertDialog.Popup {...props} data-level={2} ref={mergedRef} style={withStyle({ zIndex: layer.popup }, style)} initialFocus={initialFocus ?? (() => popup.current?.querySelector<HTMLElement>("[data-basalt-cancel]") ?? true)} className={withClass("basalt-dialog", className)}>{inLevel(2, children)}</BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
    </ModalDepth.Provider>
  );
}

export type SheetSide = "left" | "right" | "bottom";
export interface SheetContentProps extends DialogContentProps {
  side?: SheetSide;
}

export { Dialog as Sheet, DialogTrigger as SheetTrigger, DialogTitle as SheetTitle, DialogDescription as SheetDescription, DialogClose as SheetClose, DialogActions as SheetActions };

/** A modal side panel for a task or detail, with native dialog focus and dismissal behaviour. */
export function SheetContent({ side = "right", className, style, children, ...props }: SheetContentProps) {
  const layer = useModalLayer();
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop basalt-sheet-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} data-side={side} data-level={2} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-sheet", className)}>{inLevel(2, children)}</BaseDialog.Popup>
    </BaseDialog.Portal>
    </ModalDepth.Provider>
  );
}
