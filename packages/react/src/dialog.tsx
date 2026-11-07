import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { ModalDepth, useModalLayer } from "./layers";
import type { ChangeDetails, PartProps } from "./types";
import { withClass, withStyle } from "./utils";

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails) => void;
  /** Called after the open or close transition has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** `true` (the default) locks scroll and makes the page inert; `"trap-focus"` keeps scroll and traps focus only. */
  modal?: boolean | "trap-focus";
  /** Ignore clicks outside the dialog. */
  disablePointerDismissal?: boolean;
  children?: React.ReactNode;
}

/**
 * A modal dialog. Focus moves into it, stays inside while it's open, and returns to the
 * trigger when it closes; Esc closes it.
 */
export function Dialog(props: DialogProps) {
  return <BaseDialog.Root {...props} />;
}

export interface DialogTriggerProps extends PartProps<"button"> {
  nativeButton?: boolean;
}

export function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return <BaseDialog.Trigger {...props} className={withClass("basalt-dialog-trigger", className)} />;
}

export interface DialogContentProps extends PartProps<"div"> {
  /** What receives focus on open: `true` for the first control, `false` for none, an element, or a function that returns one. */
  initialFocus?: boolean | React.RefObject<HTMLElement | null> | ((interaction: string) => boolean | HTMLElement | null | void);
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: boolean | React.RefObject<HTMLElement | null> | ((interaction: string) => boolean | HTMLElement | null | void);
}

export function DialogContent({ className, style, ...props }: DialogContentProps) {
  const layer = useModalLayer();
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-dialog", className)} />
    </BaseDialog.Portal>
    </ModalDepth.Provider>
  );
}

/** Required in every dialog: it's the dialog's accessible name. */
export function DialogTitle({ className, ...props }: PartProps<"h2">) {
  return <BaseDialog.Title {...props} className={withClass("basalt-dialog-title", className)} />;
}

export function DialogDescription({ className, ...props }: PartProps<"p">) {
  return <BaseDialog.Description {...props} className={withClass("basalt-dialog-description", className)} />;
}

/** The row of actions at the end of a dialog: cancel first, the primary action last. */
export function DialogActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={["basalt-dialog-actions", className].filter(Boolean).join(" ")} />;
}

export interface DialogCloseProps extends PartProps<"button"> {
  nativeButton?: boolean;
}

export function DialogClose(props: DialogCloseProps) {
  return <BaseDialog.Close {...props} />;
}
