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
  const form = React.useRef<FormState>({ dirty: false, opened: undefined });
  const { onOpenChange } = props;
  return (
    <DialogModal.Provider value={props.modal === undefined || props.modal === true}>
      <DialogForm.Provider value={form.current}>
        <BaseDialog.Root
          {...props}
          onOpenChange={(open, details) => {
            // A form is closed by a press on the scrim only while nothing has been entered (Esc, Close and Cancel always close it).
            if (!open && details.reason === "outside-press" && form.current.dirty) {
              details.cancel();
              return;
            }
            form.current.dirty = false;
            form.current.opened = open ? modalityOf(details.event) : undefined;
            onOpenChange?.(open, details);
          }}
        />
      </DialogForm.Provider>
    </DialogModal.Provider>
  );
}

/** What a form dialog learns about its opening and its fields: whether anything has been entered, and the input that opened it. */
interface FormState {
  dirty: boolean;
  opened: "touch" | "keyboard" | undefined;
}
const DialogForm = React.createContext<FormState | null>(null);

/**
 * The input that opened a dialog, from the event that opened it: a touch or a pen tap is `touch`, an activation with no pointer (Enter or Space on a button: a
 * click with a detail of 0) is `keyboard`. Anything else is left to the primitive's own reading, which follows the last pointer.
 */
function modalityOf(event: Event | undefined): FormState["opened"] {
  if (!event) return undefined;
  if (event.type === "keydown" || event.type === "keyup") return "keyboard";
  const pointer = (event as PointerEvent).pointerType;
  if (pointer === "touch" || pointer === "pen") return "touch";
  if (event.type === "click" && (event as MouseEvent).detail === 0) return "keyboard";
  return undefined;
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
   * A form or a task (DECISIONS 222: tasks open in the center): the sheet's `SheetHeader`, `SheetBody` and `SheetFooter` in a dialog box (a held head with the title and a 44px
   * Close, a body that scrolls and opens with the description, a held foot with Cancel, then the primary). It is at most the window less `space-4` above and below; its top is
   * held where it opened and it grows downward (it re-centres only when the window is resized); a press on the scrim closes it only while nothing has been entered; focus
   * on opening goes to the first field, or to the title (no ring) when a touch opened it; and under 720 it is a full-screen modal, square, rising from the bottom.
   */
  form?: boolean;
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

export function DialogContent({ className, style, children, ref, size = "default", initialFocus, form = false, ...props }: DialogContentProps) {
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement | null>(null);
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const state = React.useContext(DialogForm);
  const keepRef = React.useCallback((element: HTMLDivElement | null) => {
    popup.current = element;
    setNode(element);
    if (typeof ref === "function") return ref(element);
    if (ref) ref.current = element;
  }, [ref]);
  const popupRef = useModalOutside<HTMLDivElement>(keepRef, React.useContext(DialogModal));
  const top = useHeldTop(node, form);
  // A wide dialog is a manual: its first focus is its name, not the first button, so Enter on opening does nothing. A form opens on its first field, or on its title when a
  // touch opened it, so no keyboard rises over a form before the reader has seen it.
  const title = () => popup.current?.querySelector<HTMLElement>(".basalt-dialog-title") ?? true;
  const first: FocusTarget | undefined = initialFocus ?? (size === "wide" ? title : form ? (type: string) => ((state?.opened ?? type) === "touch" ? title() : popup.current?.querySelector<HTMLElement>(FIRST_FIELD) ?? true) : undefined);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} ref={popupRef} data-level={MODAL_LEVEL} data-size={size === "default" ? undefined : size} data-form={form ? "" : undefined} data-held={top === null ? undefined : ""} initialFocus={first} onInput={(event) => { if (form && state) state.dirty = true; props.onInput?.(event); }} onChange={(event) => { if (form && state) state.dirty = true; props.onChange?.(event); }} style={withStyle(top === null ? { zIndex: layer.popup } : { zIndex: layer.popup, "--basalt-dialog-top": `${top}px` } as React.CSSProperties, style)} className={withClass("basalt-dialog", className)}>{inLevel(MODAL_LEVEL, children)}</BaseDialog.Popup>
    </BaseDialog.Portal>
    </ModalDepth.Provider>
  );
}

/** The first thing a person fills in: a text field, a select, a combobox or a text area that is not hidden or disabled. */
const FIRST_FIELD = 'input:not([type="hidden"]):not([disabled]):not([type="checkbox"]):not([type="radio"]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([aria-disabled="true"]):not([disabled])';

/**
 * A form's top, held where it opened: where a centred dialog of its height would sit (the window less its height, halved, and never nearer the edge than `space-4`), measured
 * once as it opens and again only when the window is resized, so whatever grows inside (an error under a field) grows downward and the title does not move. `null` while it is
 * being measured, in its natural centre, and for a dialog that is not a form or that is a full-screen modal (under 720).
 */
function useHeldTop(node: HTMLElement | null, form: boolean): number | null {
  const [top, setTop] = React.useState<number | null>(null);
  const [epoch, setEpoch] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!node) { setTop(null); return; }
    if (!form) return;
    // The full-screen form (under size-breakpoint-md, 720px) has no top to hold.
    if (window.matchMedia("(width < 720px)").matches) { setTop(null); return; }
    // The margin from the window's edge is what its own max-height leaves: the window less twice `space-4`.
    const max = Number.parseFloat(getComputedStyle(node).maxHeight);
    const gap = Number.isFinite(max) ? Math.max(0, (window.innerHeight - max) / 2) : 0;
    setTop(Math.max(gap, Math.round((window.innerHeight - node.offsetHeight) / 2)));
  }, [node, form, epoch]);
  React.useEffect(() => {
    if (!node || !form) return undefined;
    const resize = () => { setTop(null); setEpoch((n) => n + 1); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [node, form]);
  return top;
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
