import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { ModalDepth, useModalLayer } from "./layers";
import { withClass, withStyle } from "./utils";

/**
 * A modal dialog. Focus moves into it, stays inside while it's open, and returns to the
 * trigger when it closes; Esc closes it.
 */
export const Dialog = BaseDialog.Root;

export function DialogTrigger({ className, ...props }: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger {...props} className={withClass("basalt-dialog-trigger", className)} />;
}

export function DialogContent({ className, style, ...props }: React.ComponentProps<typeof BaseDialog.Popup>) {
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
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title {...props} className={withClass("basalt-dialog-title", className)} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description {...props} className={withClass("basalt-dialog-description", className)} />;
}

/** The row of actions at the end of a dialog: cancel first, the primary action last. */
export function DialogActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={["basalt-dialog-actions", className].filter(Boolean).join(" ")} />;
}

export const DialogClose = BaseDialog.Close;
