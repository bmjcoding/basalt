import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { ControlSize } from "./button";
import type { ChangeDetails, PartProps } from "./types";
import { withClass } from "./utils";

export type InputProps = PartProps<"input"> & {
  /** Called with the new text, and why it changed. Prefer it to `onChange` inside a `Field`. */
  onValueChange?: (value: string, details: ChangeDetails) => void;
  /** Control height: 24 to 40px; md (32px) is the app default. */
  controlSize?: ControlSize;
};

/** A text input. Inside a `Field` it takes the field's label, description and error. */
export function Input({ controlSize = "md", className, ...props }: InputProps) {
  return <BaseInput {...props} data-size={controlSize} className={withClass("basalt-input", className)} />;
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
  /** The visible label. Every field has one; placeholder text is not a label. */
  label: React.ReactNode;
  /** Help shown under the control, linked to it for screen readers. */
  description?: React.ReactNode;
  /** An error message, shown and announced when the field is invalid. */
  error?: React.ReactNode;
  /** The control, usually an `Input`. */
  children: React.ReactNode;
}

/** A labelled form field: label, control, description and error, wired together. */
export function Field({ label, description, error, children, className, ...props }: FieldProps) {
  return (
    <BaseField.Root {...props} className={withClass("basalt-field", className)}>
      <BaseField.Label className="basalt-field-label">{label}</BaseField.Label>
      {children}
      {description ? <BaseField.Description className="basalt-field-description">{description}</BaseField.Description> : null}
      {error ? <BaseField.Error className="basalt-field-error" match={props.invalid ? true : undefined}>{error}</BaseField.Error> : null}
    </BaseField.Root>
  );
}
