import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { inLevel, ModalDepth, useModalLayer } from "./layers";
import type { FocusTarget, OpenChangeDetails, PartProps, PopupActions } from "./types";
import { withClass, withStyle } from "./utils";

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  /** Called after the open or close transition has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** `true` (the default) locks scroll and makes the page inert; `"trap-focus"` keeps scroll and traps focus only. */
  modal?: boolean | "trap-focus";
  /**
   * Imperative handle: `unmount()` ends a closing animation you ran yourself, after `details.preventUnmountOnClose()`
   * in `onOpenChange`; `close()` closes the dialog.
   */
  actionsRef?: React.RefObject<PopupActions | null>;
  /** Which trigger the dialog belongs to when it has several: the `id` of one `DialogTrigger`. Use with `open`. */
  triggerId?: string | null;
  defaultTriggerId?: string | null;
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
  initialFocus?: FocusTarget;
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: FocusTarget;
}

export function DialogContent({ className, style, children, ...props }: DialogContentProps) {
  const layer = useModalLayer();
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} data-level={2} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-dialog", className)}>{inLevel(2, children)}</BaseDialog.Popup>
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
