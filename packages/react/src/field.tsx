import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { ControlSize } from "./button";
import { withClass } from "./utils";

export type InputProps = React.ComponentProps<typeof BaseInput> & {
  /** Control height: 24 to 40px; md (32px) is the app default. */
  controlSize?: ControlSize;
};

/** A text input. Inside a `Field` it takes the field's label, description and error. */
export function Input({ controlSize = "md", className, ...props }: InputProps) {
  return <BaseInput {...props} data-size={controlSize} className={withClass("basalt-input", className)} />;
}

export interface FieldProps extends Omit<React.ComponentProps<typeof BaseField.Root>, "children"> {
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
