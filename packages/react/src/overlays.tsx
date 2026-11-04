import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { DialogActions, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { ModalDepth, useModalLayer } from "./layers";
import { withClass, withStyle } from "./utils";

export const AlertDialog = BaseAlertDialog.Root;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;
export const AlertDialogActions = DialogActions;
export const AlertDialogAction = BaseAlertDialog.Close;

export function AlertDialogTrigger({ className, ...props }: React.ComponentProps<typeof BaseAlertDialog.Trigger>) {
  return <BaseAlertDialog.Trigger {...props} className={withClass("basalt-dialog-trigger", className)} />;
}

/** The safe action. It receives initial focus even when the destructive action appears first. */
export function AlertDialogCancel(props: React.ComponentProps<typeof BaseAlertDialog.Close>) {
  return <BaseAlertDialog.Close {...props} data-basalt-cancel="" />;
}

export function AlertDialogContent({ className, initialFocus, ref, style, ...props }: React.ComponentProps<typeof BaseAlertDialog.Popup>) {
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
      <BaseAlertDialog.Popup {...props} ref={mergedRef} style={withStyle({ zIndex: layer.popup }, style)} initialFocus={initialFocus ?? (() => popup.current?.querySelector<HTMLElement>("[data-basalt-cancel]") ?? true)} className={withClass("basalt-dialog", className)} />
    </BaseAlertDialog.Portal>
    </ModalDepth.Provider>
  );
}

export type SheetSide = "left" | "right" | "bottom";
export interface SheetContentProps extends React.ComponentProps<typeof BaseDialog.Popup> {
  side?: SheetSide;
}

export const Sheet = BaseDialog.Root;
export const SheetTrigger = DialogTrigger;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetClose = BaseDialog.Close;
export const SheetActions = DialogActions;

/** A modal side panel for a task or detail, with native dialog focus and dismissal behaviour. */
export function SheetContent({ side = "right", className, style, ...props }: SheetContentProps) {
  const layer = useModalLayer();
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop basalt-sheet-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} data-side={side} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-sheet", className)} />
    </BaseDialog.Portal>
    </ModalDepth.Provider>
  );
}
