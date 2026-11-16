import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { ControlSize } from "./button";
import type { ChangeDetails, PartProps, ValidateActions } from "./types";
import { withClass } from "./utils";

export type InputProps = PartProps<"input"> & {
  /** Called with the new text, and why it changed. Prefer it to `onChange` inside a `Field`. */
  onValueChange?: (value: string, details: ChangeDetails) => void;
  /** Control height: 24 to 40px; md (32px) is the app default. */
  controlSize?: ControlSize;
};

// Whether the `Field` an input sits in is required: the input then carries `required`, which is what a screen reader says.
const FieldRequiredContext = React.createContext(false);

/** A text input. Inside a `Field` it takes the field's label, description and error, and, in a required field, `required`. */
export function Input({ controlSize = "md", className, required, ...props }: InputProps) {
  const inRequiredField = React.useContext(FieldRequiredContext);
  return <BaseInput {...props} required={required ?? (inRequiredField || undefined)} data-size={controlSize} className={withClass("basalt-input", className)} />;
}

export interface FieldProps extends Omit<PartProps<"div">, "children"> {
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

/** A labelled form field: label, control, description and error, wired together. */
export function Field({ label, required, optional, requiredLabel = "Required", optionalLabel = "Optional", description, error, children, className, ...props }: FieldProps) {
  const necessity = required ? requiredLabel : optional ? optionalLabel : null;
  return (
    <BaseField.Root {...props} className={withClass("basalt-field", className)}>
      <BaseField.Label className="basalt-field-label">
        {label}
        {necessity ? <span className="basalt-field-necessity" aria-hidden="true">{necessity}</span> : null}
      </BaseField.Label>
      <FieldRequiredContext.Provider value={Boolean(required)}>{children}</FieldRequiredContext.Provider>
      {description ? <BaseField.Description className="basalt-field-description">{description}</BaseField.Description> : null}
      {error ? <BaseField.Error className="basalt-field-error" match={props.invalid ? true : undefined}>{error}</BaseField.Error> : null}
    </BaseField.Root>
  );
}
