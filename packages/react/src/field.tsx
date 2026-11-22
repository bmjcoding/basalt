import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { ControlSize } from "./button";
import { FieldGroupContext } from "./field-group";
import { formGridPlacement } from "./form-grid";
import type { FormGridPlacement } from "./form-grid";
import type { ChangeDetails, PartProps, ValidateActions } from "./types";
import { withClass } from "./utils";
import { useJoinedRef, useWriting } from "./wait";
import type { WritingEmpty } from "./wait";

export type InputProps = PartProps<"input"> & {
  /** Called with the new text, and why it changed. Prefer it to `onChange` inside a `Field`. */
  onValueChange?: (value: string, details: ChangeDetails) => void;
  /** Control height: 24 to 40px; md (32px) is the app default. */
  controlSize?: ControlSize;
  /**
   * Something else is writing into the field: an agent's draft, a summary written again (DECISIONS 260). It is read-only and `aria-busy` at
   * once, until the writing ends; after 300ms its words dim to secondary ink, its boundary turns dashed and its fill takes the skeleton's calm pulse, for at least 400ms. It is not disabled: the
   * size, the boundary and the focus stay, and nothing moves when it starts or ends. Empty, it shows the pulse alone. Each new `value` is
   * painted as it comes, and an empty `value` while writing keeps the text that was there, so the field never blanks between drafts (`writingEmpty`).
   */
  writing?: boolean;
  /** What an empty `value` shows while `writing`: `"keep"` (the default) keeps the text that was there; `"clear"` shows the field empty, the busy look kept. */
  writingEmpty?: WritingEmpty;
};

// Whether the `Field` an input sits in is required: the input then carries `required`, which is what a screen reader says.
const FieldRequiredContext = React.createContext(false);

/** A text input. Inside a `Field` it takes the field's label, description and error, and, in a required field, `required`. */
export function Input({ controlSize = "md", className, required, writing = false, writingEmpty = "keep", value, readOnly, ref, ...props }: InputProps) {
  const inRequiredField = React.useContext(FieldRequiredContext);
  const own = React.useRef<HTMLInputElement | null>(null);
  const written = useWriting(writing, value, own, writingEmpty);
  return (
    <BaseInput
      {...props}
      ref={useJoinedRef(ref, own)}
      value={written.value}
      readOnly={written.busy || readOnly}
      aria-busy={written.busy ? true : props["aria-busy"]}
      data-writing={written.shown ? "" : undefined}
      required={required ?? (inRequiredField || undefined)}
      data-size={controlSize}
      className={withClass("basalt-input", className)}
    />
  );
}

export interface FieldProps extends Omit<PartProps<"div">, "children">, FormGridPlacement {
  /** Name the field is submitted and validated under. */
  name?: string;
  disabled?: boolean;
  /** Mark the field invalid yourself, e.g. from a server response. */
  invalid?: boolean;
  dirty?: boolean;
  touched?: boolean;
  /** Return a message (or messages) when the value is invalid. */
  validate?: (value: unknown, formValues: Record<string, unknown>) => string | string[] | null | void | Promise<string | string[] | null | void>;
  validationMode?: "onSubmit" | "onBlur" | "onChange";
  validationDebounceTime?: number;
  /** Validate this field on demand: `actionsRef.current?.validate()`. */
  actionsRef?: React.RefObject<ValidateActions | null>;
  /** The visible label. Every field has one; placeholder text is not a label. */
  label: React.ReactNode;
  /**
   * The field must be filled in: "Required" shows directly after the label, in tertiary ink, and the `Input` inside carries `required`,
   * which is what a screen reader says (the word is hidden from assistive technology, so it is not said twice). Never an asterisk.
   */
  required?: boolean;
  /**
   * The field may be left empty, and the author says so: "Optional" shows directly after the label. A field marked neither shows
   * nothing. `required` wins if both are set.
   */
  optional?: boolean;
  /**
   * A node at the end of the label's row, on the label track: a `TextButton` such as "Suggest a name" beside a Name field, or "Use my address". It is not inside the `<label>`, so a press on
   * it never focuses the control, and the label stays as wide as its words and "Required" (DECISIONS 233). In a `FormGrid` the row is the label track, so
   * it lines up with the fields beside it. It names its own action: give a button words that say what it does, beside this field's label.
   */
  labelAction?: React.ReactNode;
  /** The word after a required field's label, for translation. Default "Required". */
  requiredLabel?: string;
  /** The word after an optional field's label, for translation. Default "Optional". */
  optionalLabel?: string;
  /** Help shown under the control, linked to it for screen readers. */
  description?: React.ReactNode;
  /** An error message, shown and announced when the field is invalid. */
  error?: React.ReactNode;
  /** The control, usually an `Input`. */
  children: React.ReactNode;
}

/**
 * A labelled form field: label, control, description and error, wired together. A control that is a group (a `SegmentedControl`) is named by the label, with "Required" said after
 * it in a required field, and described by the description and, while the field is `invalid`, the error. In a `FormGrid` it takes `column`, `row` and `rows`.
 */
export function Field({ label, required, optional, requiredLabel = "Required", optionalLabel = "Optional", labelAction, description, error, children, className, style, column, row, rows, ...props }: FieldProps) {
  const necessity = required ? requiredLabel : optional ? optionalLabel : null;
  const id = React.useId();
  const group = React.useMemo(() => ({
    labelId: `${id}-label`,
    descriptionId: description ? `${id}-description` : undefined,
    errorId: error && props.invalid ? `${id}-error` : undefined,
    required: Boolean(required),
    requiredLabel,
    invalid: Boolean(props.invalid),
  }), [id, description, error, props.invalid, required, requiredLabel]);
  const labelElement = (
    <BaseField.Label id={group.labelId} className="basalt-field-label">
      {label}
      {necessity ? <span className="basalt-field-necessity" aria-hidden="true">{necessity}</span> : null}
    </BaseField.Label>
  );
  const place = formGridPlacement({ column, row, rows });
  return (
    <BaseField.Root {...props} {...place} style={typeof style === "function" ? (state) => ({ ...place.style, ...style(state) }) : { ...place.style, ...style }} className={withClass("basalt-field", className)}>
      {labelAction ? <div className="basalt-field-label-row">{labelElement}{labelAction}</div> : labelElement}
      <FieldGroupContext.Provider value={group}>
        <FieldRequiredContext.Provider value={Boolean(required)}>{children}</FieldRequiredContext.Provider>
      </FieldGroupContext.Provider>
      {description ? <BaseField.Description id={group.descriptionId} className="basalt-field-description">{description}</BaseField.Description> : null}
      {error ? <BaseField.Error id={group.errorId} className="basalt-field-error" match={props.invalid ? true : undefined}>{error}</BaseField.Error> : null}
    </BaseField.Root>
  );
}
