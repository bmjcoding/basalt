import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { PartProps } from "./types";
import { join, withClass } from "./utils";

// ---- Inline-label form rows (DECISIONS 162, D15: V10 and R12) ----
// A label, then a bare field: no box and no edge of its own. Each row's bottom line is the input boundary and divides the rows. On focus a
// real 2px outline runs round the row, at −2 inset (the field is flush with the form's edge), and it is a system colour in forced colours.

export interface InlineFieldsProps extends React.ComponentProps<"div"> {}

/** A run of inline rows: a hairline at the top and under every row, so the form reads as one ruled sheet. */
export function InlineFields({ className, ...props }: InlineFieldsProps) {
  return <div {...props} className={join("basalt-inline-fields", className)} />;
}

export interface InlineFieldProps extends Omit<PartProps<"div">, "children"> {
  /** The visible label. It is the field's name. */
  label: React.ReactNode;
  /** The row grows with a multi-line field (a textarea): its label sits at the top. */
  multiline?: boolean;
  /** The field: `InlineInput` or `InlineTextarea`. */
  children: React.ReactNode;
}

/**
 * One row: a label in `size-field-label-inline` (80px), then the field. At least 44px tall (`size-tap-min`), and a textarea grows its row. Text
 * entry is 16px on touch. The row's bottom line is `border-input`, 3:1 against the page.
 */
export function InlineField({ label, multiline = false, className, children, ...props }: InlineFieldProps) {
  return (
    <BaseField.Root {...props} data-multiline={multiline ? "" : undefined} className={withClass("basalt-inline-field", className)}>
      <BaseField.Label className="basalt-inline-label">{label}</BaseField.Label>
      {children}
    </BaseField.Root>
  );
}

/** A row that is not a field: a label and a value, with the same height and rules ("to: someone"). */
export function InlineValue({ label, className, children, ...props }: Omit<React.ComponentProps<"div">, "children"> & { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div {...props} className={join("basalt-inline-field", className)}>
      <span className="basalt-inline-label">{label}</span>
      <span className="basalt-inline-value">{children}</span>
    </div>
  );
}

/** The bare text input of an inline row, named by the row's label. */
export function InlineInput({ className, ...props }: PartProps<"input">) {
  return <BaseInput {...props} className={withClass("basalt-inline-control", className)} />;
}

/** The bare textarea of an inline row, named by the row's label. Seven visible lines unless `rows` says otherwise. */
export function InlineTextarea({ rows = 7, className, ...props }: Omit<PartProps<"textarea">, "render">) {
  return <BaseField.Control {...(props as object)} className={withClass("basalt-inline-control basalt-inline-textarea", className)} render={<textarea rows={rows} />} />;
}
