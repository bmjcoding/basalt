import { Input as BaseInput } from "@base-ui/react/input";
import { PaperclipIcon } from "@phosphor-icons/react/dist/csr/Paperclip";
import * as React from "react";

import { IconButton } from "./button";
import type { ControlSize } from "./button";
import { useInRequiredField } from "./field-group";
import { CloseGlyph } from "./glyphs/close";
import { Icon } from "./icon";
import type { PartProps } from "./types";
import { join } from "./utils";
import { useJoinedRef } from "./wait";

export interface FileInputProps extends Omit<PartProps<"input">, "type" | "value" | "defaultValue" | "children"> {
  /** The box's height, as `Input`'s: 32 at `md`; 44 on a coarse pointer and under 720. */
  controlSize?: ControlSize;
  /** The files now held, `[]` when cleared or reset. Read once per change of the input, whatever made it (a pick, a drop, Clear, a reset). */
  onValueChange?: (files: File[]) => void;
  /** The words at the box's end while it is empty. Default "Choose file"; "Choose files" with `multiple`. */
  chooseLabel?: string;
  /** The file line while nothing is chosen. Default "No file chosen". */
  emptyLabel?: string;
  /** Clear's name. Default "Clear chosen file"; "Clear chosen files" with `multiple`. */
  clearLabel?: string;
  /** The file line for more than one file. Default (n) => `${n} files chosen`. */
  filesLabel?: (count: number) => string;
  /** One file's size. Default: en-US, the short unit, one decimal at most ("14.3 kB", "2.5 MB"). */
  formatSize?: (bytes: number) => string;
}

const defaultFiles = (count: number) => `${count} files chosen`;

/** Bytes in decimal units (kB is 1000 bytes, as the browser's own file sizes are written), one decimal at most. Built on use. */
function defaultSize(bytes: number) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
  let at = 0;
  let value = bytes;
  while (value >= 1000 && at < units.length - 1) {
    value /= 1000;
    at += 1;
  }
  return new Intl.NumberFormat("en-US", { style: "unit", unit: units[at], unitDisplay: "short", maximumFractionDigits: 1 }).format(value);
}

/**
 * A file field (cimip-gaps-3 t4, item 4), a control for `Field`: one box drawn as `Input` is, a paperclip, the file line, and at its end "Choose file" (or, once chosen,
 * one file's size and Clear). The native input is the control: it covers the box (all but Clear) unseen, so it is the one tab stop, the label's target, the form's
 * value and the drop target, and a press or Space opens the browser's chooser. What is drawn is only ever a reading of `input.files`, taken on each `change`, on
 * mount and after the form's reset: Basalt never writes `input.files` and handles no drop. Clear empties the input, sends one bubbling `change` and focuses it.
 * Uncontrolled: no upload, list or dropzone. A wrong type or size is the app's check in `onValueChange` and the field's `error`.
 */
export function FileInput({
  controlSize = "md",
  onValueChange,
  multiple,
  chooseLabel = multiple ? "Choose files" : "Choose file",
  emptyLabel = "No file chosen",
  clearLabel = multiple ? "Clear chosen files" : "Clear chosen file",
  filesLabel = defaultFiles,
  formatSize = defaultSize,
  className,
  style,
  required,
  disabled,
  onChange,
  ref,
  ...props
}: FileInputProps) {
  const inRequiredField = useInRequiredField();
  const input = React.useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [drag, setDrag] = React.useState(false);
  const report = React.useRef(onValueChange);
  report.current = onValueChange;
  const filesHeld = React.useRef(0);
  filesHeld.current = files.length;
  const read = React.useCallback((tell: boolean) => {
    const now = input.current?.files ? Array.from(input.current.files) : [];
    setFiles(now);
    if (tell) report.current?.(now);
  }, []);
  React.useLayoutEffect(() => {
    const element = input.current;
    if (!element) return undefined;
    // A pick before hydration, or a page the browser restored with its files: what the input holds is what is shown, and said.
    if (element.files?.length) read(true);
    const form = element.form;
    // A reset event comes before the reset: the input is read once the browser has emptied it.
    let timer = 0;
    const onReset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (input.current?.files?.length === 0) read(filesHeld.current > 0);
      });
    };
    form?.addEventListener("reset", onReset);
    return () => {
      window.clearTimeout(timer);
      form?.removeEventListener("reset", onReset);
    };
  }, [read]);
  const clear = () => {
    const element = input.current;
    if (!element) return;
    element.value = "";
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.focus();
  };
  const carriesFiles = (event: React.DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const one = files.length === 1 ? files[0] : undefined;
  return (
    <span
      className={join("basalt-input basalt-file-input", typeof className === "string" ? className : undefined)}
      style={typeof style === "object" ? style : undefined}
      data-size={controlSize}
      data-chosen={files.length ? "" : undefined}
      data-drag={drag && !disabled ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
    >
      <BaseInput
        {...props}
        ref={useJoinedRef(ref, input)}
        type="file"
        multiple={multiple}
        disabled={disabled}
        required={required ?? (inRequiredField || undefined)}
        className={typeof className === "function" ? className : "basalt-file-input-native"}
        style={typeof style === "function" ? style : undefined}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          setDrag(false);
          read(true);
        }}
        onDragEnter={(event: React.DragEvent<HTMLInputElement>) => { props.onDragEnter?.(event); if (carriesFiles(event)) setDrag(true); }}
        onDragOver={(event: React.DragEvent<HTMLInputElement>) => { props.onDragOver?.(event); if (carriesFiles(event)) setDrag(true); }}
        onDragLeave={(event: React.DragEvent<HTMLInputElement>) => { props.onDragLeave?.(event); setDrag(false); }}
        // Only the look is reset here: the drop itself is the browser's, which fires `change`. Nothing is read or prevented.
        onDrop={(event: React.DragEvent<HTMLInputElement>) => { props.onDrop?.(event); setDrag(false); }}
      />
      <span className="basalt-file-input-face" aria-hidden="true">
        <Icon icon={PaperclipIcon} size={16} />
        <span className="basalt-file-input-line" data-empty={files.length ? undefined : ""}>
          {files.length === 0 ? emptyLabel : one ? one.name : filesLabel(files.length)}
        </span>
        {files.length === 0 ? <span className="basalt-file-input-choose">{chooseLabel}</span> : null}
        {one ? <span className="basalt-file-input-size">{formatSize(one.size)}</span> : null}
      </span>
      {files.length ? <IconButton className="basalt-file-input-clear" size="xs" icon={CloseGlyph} label={clearLabel} disabled={disabled} onClick={clear} /> : null}
    </span>
  );
}
