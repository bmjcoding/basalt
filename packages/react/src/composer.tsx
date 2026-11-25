import * as React from "react";

import { ActionShortcut } from "./action-shortcut";
import { Button } from "./button";
import { Textarea, useFitToText } from "./feedback";
import { isComposingKey } from "./keyboard";
import { isModKey } from "./platform";
import { isThenable, useJoinedRef } from "./wait";
import { join } from "./utils";

// The composer (cimip-gaps-2, B3): where a person writes a message. A field with no visible label (its accessible name is `label`), the
// send action at the row's end, the app's own second actions at its start, and a status line under it (who is typing) that is always one
// line tall, so nothing moves when someone starts. The field grows with its text to `maxRows`, then scrolls. Enter sends (Shift+Enter is a
// new line), or Mod+Enter where `sendKey` says so; a key and a press are one send: the key presses the button, so the button's own wait
// (`waitForAnswer`) guards both and a second Enter while a message is out sends nothing. Nothing here runs at import.

export interface ComposerProps extends Omit<React.ComponentProps<"div">, "onChange" | "defaultValue" | "children"> {
  /** The field's accessible name ("Message the team", "Reply to Ana"). There is no visible label: say where the message goes in `placeholder` too. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Sends the message (trimmed of its outer space). Return a promise and the send waits for it: Send is busy and a second send does nothing until
   * it settles. On success the field is cleared, unless the text was changed meanwhile; return `false` (or resolve to it) to keep the text. A
   * rejection keeps the text and is passed on, as a button's is.
   */
  onSend: (value: string) => unknown;
  /** Which key sends from the field. "Enter" (Shift+Enter is a new line), or "Mod+Enter" (⌘↵ on Apple's systems, Ctrl+Enter elsewhere), shown as chips beside Send. Default "Enter". */
  sendKey?: "Enter" | "Mod+Enter";
  /** Send's words. Default "Send". */
  sendLabel?: string;
  /** Wait for a promise `onSend` returns. Default true. */
  waitForAnswer?: boolean;
  placeholder?: string;
  /** Lines the field shows when empty. Default 2, the textarea's own least. */
  rows?: number;
  /** Lines it grows to with its text before it scrolls. Default 8. */
  maxRows?: number;
  /**
   * The app's other actions, at the start of the row under the field: an attach button, a format toggle. Send is always the row's last. The first,
   * when it is a ghost control, takes `edge="start"`: its glyph goes on the field's line, hung into the room the box holding the composer says it
   * has (`AppShell`'s foot, a card's content); the composer itself says none (DECISIONS 336).
   */
  actions?: React.ReactNode;
  /**
   * Who is typing (`typingStatus`), a draft saved: in the actions row after the app's actions, on a row of its own under them when its words do not fit
   * beside them. A polite live region, always mounted; with no status no line is held.
   */
  status?: React.ReactNode;
  /**
   * Names in the field: render the picker for the composer's field, `(field) => <MentionPicker field={field} options={people} />`. The app imports
   * `MentionPicker` itself, so a composer without names never carries it.
   */
  mentions?: (field: React.RefObject<HTMLTextAreaElement | null>) => React.ReactNode;
  disabled?: boolean;
  /** The field's element. */
  inputRef?: React.Ref<HTMLTextAreaElement>;
  /** More for the field: `name`, `maxLength`, `autoFocus`, `id`, its own key handler (which sees `defaultPrevented` on a key the composer used). */
  textareaProps?: Omit<React.ComponentProps<"textarea">, "value" | "defaultValue" | "rows" | "placeholder" | "disabled" | "aria-label" | "className" | "ref">;
}

/**
 * A message field with its send action. The field has an accessible name and no visible label; it grows with its text up to `maxRows` and
 * then scrolls. The row under it holds the app's `actions`, the `status` (a polite live region) and Send (primary, the row's last). A key sends by pressing Send, so a send is guarded by the button's own wait. With `mentions`, the
 * trigger opens a picker of names while focus stays in the field.
 */
export function Composer({ label, value, defaultValue = "", onValueChange, onSend, sendKey = "Enter", sendLabel = "Send", waitForAnswer = true, placeholder, rows = 2, maxRows = 8, actions, status, mentions, disabled = false, inputRef, textareaProps, className, style, ...props }: ComposerProps) {
  const [inner, setInner] = React.useState(defaultValue);
  const text = value !== undefined ? value : inner;
  const own = React.useRef<HTMLTextAreaElement | null>(null);
  const joined = useJoinedRef(inputRef, own);
  const send = React.useRef<HTMLButtonElement | null>(null);
  const latest = React.useRef(text);
  latest.current = text;
  const empty = text.trim() === "";
  const min = Math.max(1, rows);
  const max = Math.max(min, maxRows);

  const change = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  // Cleared only if the field still holds what was sent: words typed while it was out stay.
  const sent = (what: string, kept: unknown) => {
    if (kept === false || latest.current !== what) return;
    change("");
  };
  const press = () => {
    const what = latest.current;
    const message = what.trim();
    if (!message) return undefined;
    const result = onSend(message);
    const back = () => { if (document.activeElement === send.current) own.current?.focus(); };
    if (waitForAnswer && isThenable(result)) {
      return Promise.resolve(result).then((kept) => { sent(what, kept); back(); });
    }
    if (isThenable(result)) {
      // Not waited for: each send runs, and the text goes when it is answered.
      void Promise.resolve(result).then((kept) => sent(what, kept), () => {});
      return undefined;
    }
    sent(what, result);
    back();
    return undefined;
  };

  // The field grows with its text where the browser can size it (field-sizing); elsewhere it is measured, within the same bounds (Textarea's own measure).
  useFitToText(own, true, text);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    textareaProps?.onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter" || isComposingKey(event.nativeEvent)) return;
    const sends = sendKey === "Enter" ? !event.shiftKey && !event.altKey : isModKey(event.nativeEvent) && !event.shiftKey && !event.altKey;
    if (!sends) return;
    event.preventDefault();
    // The key presses Send, so the button's wait is the one guard for both.
    send.current?.click();
  };

  const button = (
    <Button
      ref={send}
      variant="primary"
      disabled={disabled || empty}
      waitForAnswer={waitForAnswer}
      onClick={press}
      // A press keeps focus (and a phone's keyboard) in the field.
      onMouseDown={(event) => { if (document.activeElement === own.current) event.preventDefault(); }}
      aria-keyshortcuts={sendKey === "Enter" ? "Enter" : undefined}
      className="basalt-composer-send"
    >
      {sendLabel}
    </Button>
  );
  return (
    <div {...props} className={join("basalt-composer", className)} style={{ ...style, "--_rows": min, "--_max-rows": max } as React.CSSProperties} data-disabled={disabled ? "" : undefined}>
      <Textarea
        {...textareaProps}
        ref={joined}
        value={text}
        rows={min}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        enterKeyHint={sendKey === "Enter" ? "send" : undefined}
        className="basalt-composer-field"
        onChange={(event) => { textareaProps?.onChange?.(event); change(event.currentTarget.value); }}
        onKeyDown={onKeyDown}
      />
      {mentions ? mentions(own) : null}
      <div className="basalt-composer-actions">
        {/* The app's actions, then the status, beside them while its words fit and on a row of its own under them when they do not; Send stays on the
            first row. No line is held when there is no status, and the polite region is always mounted (DECISIONS 336, Q4). */}
        <div className="basalt-composer-start">
          {actions ? <div className="basalt-composer-extra">{actions}</div> : null}
          <p className="basalt-composer-status" aria-live="polite">{status}</p>
        </div>
        {sendKey === "Mod+Enter" ? <ActionShortcut shortcut="Mod+Enter" className="basalt-composer-send-group">{button}</ActionShortcut> : button}
      </div>
    </div>
  );
}
