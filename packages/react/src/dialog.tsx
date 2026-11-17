import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { inLevel, MODAL_LEVEL, ModalDepth, useModalLayer } from "./layers";
import { useModalOutside } from "./modal-outside";
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
  return (
    <DialogModal.Provider value={props.modal === undefined || props.modal === true}>
      <BaseDialog.Root {...props} />
    </DialogModal.Provider>
  );
}

/** Whether the dialog above is modal (the default): its content makes what is outside inert only then. */
export const DialogModal = React.createContext(true);

export interface DialogTriggerProps extends PartProps<"button"> {
  nativeButton?: boolean;
}

export function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return <BaseDialog.Trigger {...props} className={withClass("basalt-dialog-trigger", className)} />;
}

/** A dialog's width: the default 480, or `wide` (992px, DECISIONS 158 Q1: 118 characters of Geist Mono at 14px, 991.17px, rounded up and kept in px) for a reference dialog of columns and tables. Both are capped by the viewport. */
export type DialogSize = "default" | "wide";

export interface DialogContentProps extends PartProps<"div"> {
  /**
   * `wide` is a reference dialog's width (`size-dialog-width-wide`, 992px, DECISIONS 158 Q1), with Basalt's padding and scroll. Its first focus is its title,
   * so Enter on opening runs nothing; set `initialFocus` to choose another.
   */
  size?: DialogSize;
  /** What receives focus on open: `true` for the first control, `false` for none, an element, or a function that returns one. */
  initialFocus?: FocusTarget;
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: FocusTarget;
}

export function DialogContent({ className, style, children, ref, size = "default", initialFocus, ...props }: DialogContentProps) {
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement | null>(null);
  const keepRef = React.useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  const popupRef = useModalOutside<HTMLDivElement>(keepRef, React.useContext(DialogModal));
  // A wide dialog is a manual: its first focus is its name, not the first button, so Enter on opening does nothing.
  const first: FocusTarget | undefined = initialFocus ?? (size === "wide" ? () => popup.current?.querySelector<HTMLElement>(".basalt-dialog-title") ?? true : undefined);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} ref={popupRef} data-level={MODAL_LEVEL} data-size={size === "default" ? undefined : size} initialFocus={first} style={withStyle({ zIndex: layer.popup }, style)} className={withClass("basalt-dialog", className)}>{inLevel(MODAL_LEVEL, children)}</BaseDialog.Popup>
    </BaseDialog.Portal>
    </ModalDepth.Provider>
  );
}

/**
 * Required in every dialog: it's the dialog's accessible name. It can take focus from script (`tabIndex={-1}`), which a wide
 * dialog and a sheet's next step do, so a screen reader reads the new title; it is never a tab stop and draws no ring.
 */
export function DialogTitle({ className, tabIndex = -1, ...props }: PartProps<"h2">) {
  return <BaseDialog.Title tabIndex={tabIndex} {...props} className={withClass("basalt-dialog-title", className)} />;
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
