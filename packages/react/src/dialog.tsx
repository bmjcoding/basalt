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
  const form = React.useRef<FormState>({ opened: undefined, popup: null, initial: "", dirty: undefined });
  const { onOpenChange } = props;
  return (
    <DialogModal.Provider value={props.modal === undefined || props.modal === true}>
      <DialogForm.Provider value={form.current}>
        <BaseDialog.Root
          {...props}
          onOpenChange={(open, details) => {
            // A form is closed by a press on the scrim only while nothing has been entered (Esc, Close and Cancel always close it).
            if (!open && details.reason === "outside-press" && entered(form.current)) {
              details.cancel();
              return;
            }
            form.current.opened = open ? modalityOf(details.event) : undefined;
            onOpenChange?.(open, details);
          }}
        />
      </DialogForm.Provider>
    </DialogModal.Provider>
  );
}

/** What a form dialog learns about its opening and its fields: what they held when it opened, and the input that opened it. */
interface FormState {
  opened: "touch" | "keyboard" | undefined;
  /** The open form's box and what its fields held when it opened. */
  popup: HTMLElement | null;
  initial: string;
  /** The app's own answer (`DialogContent`'s `dirty`), which wins when it is given. */
  dirty: boolean | undefined;
}

/**
 * What one field holds, by its structure and not only its `.value`: its name and kind, and its values as a list, so no two states can read alike (an empty multiple
 * select is `[]`, one option whose value is "" is `[""]`). Every selected option of a `<select>` (one or many), whether a checkbox or a radio is checked, the files a
 * file input holds (name, size and date), and the text of the rest. A Base UI control (Select, Combobox, Switch, Checkbox, a checkbox group) keeps hidden inputs, so a
 * change of value is seen whether or not it fires an event, and a control that adds an input per chosen value changes the list's length.
 */
function held(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): [string, string, unknown[]] {
  const kind = el.tagName === "INPUT" ? `input:${(el as HTMLInputElement).type}` : el.tagName.toLowerCase();
  if (el.tagName === "SELECT") return [el.name, kind, Array.from((el as HTMLSelectElement).selectedOptions, (option) => option.value)];
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "checkbox" || input.type === "radio") return [el.name, kind, [input.value, input.checked]];
    if (input.type === "file") return [el.name, kind, Array.from(input.files ?? [], (file) => [file.name, file.size, file.lastModified])];
  }
  return [el.name, kind, [el.value]];
}
/** What the fields of a form hold, in the order they are in the form: a list of fields, each a list, written as JSON so the comparison is of the structure. */
function values(box: HTMLElement): string {
  return JSON.stringify(Array.from(box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"), held));
}
/**
 * Something is entered: the app says so (`dirty`), or, when it says nothing, a field holds something other than it held when the form opened. Read at the press, so a form typed
 * into and emptied again closes.
 */
const entered = (state: FormState) => state.dirty ?? Boolean(state.popup && values(state.popup) !== state.initial);
const DialogForm = /* @__PURE__ */ React.createContext<FormState | null>(null);

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
   * held where it opened and it grows downward (it re-centres only when the window is resized); a press on the scrim closes it only while its fields hold what they held when it opened; focus
   * on opening goes to the first field, or to the title (no ring) when a touch opened it; and under 720 it is a full-screen modal, square, rising from the bottom.
   */
  form?: boolean;
  /**
   * `wide` is a reference dialog's width (`size-dialog-width-wide`, 992px, DECISIONS 158 Q1), with Basalt's padding and scroll. A reading dialog's first focus is its title,
   * so Enter on opening runs nothing; set `initialFocus` to choose another. A wide `form` keeps a form's rule instead (DECISIONS 242): first focus on the first field, or on the
   * title when a touch opened it.
   */
  size?: DialogSize;
  /** What receives focus on open: `true` for the first control, `false` for none, an element, or a function that returns one. */
  initialFocus?: FocusTarget;
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: FocusTarget;
  /**
   * A `form`'s own answer to "has anything been entered?", for what Basalt cannot read from the fields: a custom control with no input, or defaults that load after the form
   * opened (which would otherwise read as entered). Given, it wins: `true` keeps the form open on a press on the scrim, `false` lets the scrim close it. Left out, Basalt compares
   * what the fields hold with what they held when the form opened. Esc, Close and Cancel close it either way.
   */
  dirty?: boolean;
}

export function DialogContent({ className, style, children, ref, size = "default", initialFocus, form = false, dirty, ...props }: DialogContentProps) {
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
  // A form's state lives only while it is open: opened by whatever means, it starts with what its fields hold and no remembered input; when its box goes, both go (however it was closed).
  React.useLayoutEffect(() => {
    if (!form || !state || !node) return undefined;
    state.popup = node;
    state.initial = values(node);
    return () => { state.opened = undefined; state.popup = null; state.initial = ""; };
  }, [node, form, state]);
  // The app's answer is read at the press: kept current on every render, and gone with the form.
  React.useLayoutEffect(() => {
    if (!form || !state) return undefined;
    state.dirty = dirty;
    return () => { state.dirty = undefined; };
  }, [form, state, dirty]);
  // A form opens on its first field, or on its title when a touch opened it, so no keyboard rises over a form before the reader has seen it, whatever its width. A wide
  // dialog that is not a form is a manual: its first focus is its name, not the first button, so Enter on opening does nothing.
  const title = () => popup.current?.querySelector<HTMLElement>(".basalt-dialog-title") ?? true;
  const first: FocusTarget | undefined = initialFocus ?? (form ? (type: string) => ((state?.opened ?? type) === "touch" ? title() : popup.current?.querySelector<HTMLElement>(FIRST_FIELD) ?? true) : size === "wide" ? title : undefined);
  return (
    <ModalDepth.Provider value={layer.depth}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="basalt-dialog-backdrop" style={{ zIndex: layer.backdrop }} />
      <BaseDialog.Popup {...props} ref={popupRef} data-level={MODAL_LEVEL} data-size={size === "default" ? undefined : size} data-form={form ? "" : undefined} data-held={top === null ? undefined : ""} initialFocus={first} style={withStyle(top === null ? { zIndex: layer.popup } : { zIndex: layer.popup, "--_dialog-top": `${top}px` } as React.CSSProperties, style)} className={withClass("basalt-dialog", className)}>{inLevel(MODAL_LEVEL, children)}</BaseDialog.Popup>
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
  // The held place lands where it is and never glides. It is measured while the box is centred by `translate(-50%, -50%)` (that style is resolved
  // to measure it), and the held box is placed by its top with `translateX(-50%)`: a transition between the two slid the dialog down from half its
  // height above as it opened, under reduced motion too. So the change to the held place is resolved with transitions off, and only the entry's
  // own scale and fade run (opacity alone under reduced motion). The same holds when a window resize holds it again.
  React.useLayoutEffect(() => {
    if (!node || top === null) return;
    const transition = node.style.transition;
    node.style.transition = "none";
    void getComputedStyle(node).transform;
    node.style.transition = transition;
  }, [node, top]);
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
