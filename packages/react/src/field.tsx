import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";

import type { ControlSize } from "./button";
import { FieldGroupContext } from "./field-group";
import { formGridPlacement } from "./form-grid";
import { ReserveErrorsContext } from "./field-reserve";
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
const FieldRequiredContext = /* @__PURE__ */ React.createContext(false);

/** A text input. Inside a `Field` it takes the field's label, description and error, and, in a required field, `required`. */
export function Input({ controlSize = "md", className, required, writing = false, writingEmpty, value, readOnly, ref, ...props }: InputProps) {
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
  /**
   * Hold the error's room: the hint and the error share one seat under the control, so an error moves nothing (cimip-gaps-3 t4, item 1).
   * `true` holds the taller of the hint, one line, and the `error` given when it is a string. A list holds every known message too. Strings only:
   * a sizer is text and never an element. While the error shows, the hint does not (it leaves the control's description), so the error states
   * the fix and repeats any format the hint held. Not for a hint that must stay (a link, a control, a standing instruction): that field keeps
   * the two-line form. Off by default; a `Form`'s or a `FormGrid`'s `reserveErrors` sets it for the fields inside, and this, `false` included, wins.
   */
  reserveError?: boolean | readonly string[];
  /** The control, usually an `Input`. */
  children: React.ReactNode;
}

declare const process: { env: { NODE_ENV?: string } };
let warnedFocusableHint = false;
const FOCUSABLE = "a[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]";

interface FieldFootProps {
  /** Base UI's validity for the field: false while it fails. */
  valid: boolean | null;
  id: string;
  description: React.ReactNode;
  error: React.ReactNode;
  invalid: boolean | undefined;
  disabled: boolean | undefined;
  reserve: true | readonly string[];
  required: boolean;
  requiredLabel: string;
  children: React.ReactNode;
}

/**
 * The reserved form of a field's foot: the description, the error and the sizers in one grid cell (`basalt-field-foot`). The one seen is the error while it
 * shows, else the description; the rest are unseen and keep their room. The unseen description is a plain span, so it leaves `aria-describedby`.
 */
function ReservedField({ valid, id, description, error, invalid, disabled, reserve, required, requiredLabel, children }: FieldFootProps) {
  // What Base UI's error shows for: the app's `invalid`, or a failed validation while the field is enabled. With no `error` there is nothing to show, and the hint stays.
  const erring = Boolean(error) && (invalid === true || (valid === false && !disabled));
  // The incoming line fades in, but only after the first swap: a page's first paint does not fade its hints in.
  const [initial] = React.useState(erring);
  const [swapped, setSwapped] = React.useState(false);
  if (!swapped && erring !== initial) setSwapped(true);
  const group = React.useMemo(() => ({
    labelId: `${id}-label`,
    descriptionId: description && !erring ? `${id}-description` : undefined,
    errorId: erring ? `${id}-error` : undefined,
    required,
    requiredLabel,
    invalid: Boolean(invalid),
  }), [id, description, erring, invalid, required, requiredLabel]);
  const sizers = [...new Set([...(typeof error === "string" && !erring ? [error] : []), ...(Array.isArray(reserve) ? reserve : [])])];
  const foot = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || warnedFocusableHint) return;
    if (foot.current?.querySelector(".basalt-field-description")?.querySelector(FOCUSABLE)) {
      warnedFocusableHint = true;
      console.warn("Basalt Field: a `reserveError` field's description holds a link or a control, which the error would hide; give that field the two-line form (no `reserveError`)");
    }
  });
  return (
    <>
      <FieldGroupContext.Provider value={group}>
        <FieldRequiredContext.Provider value={required}>{children}</FieldRequiredContext.Provider>
      </FieldGroupContext.Provider>
      <div ref={foot} className="basalt-field-foot" data-swapped={swapped ? "" : undefined}>
        {description ? (
          erring
            ? <span className="basalt-field-description" data-unseen="" aria-hidden="true" inert>{description}</span>
            : <BaseField.Description id={group.descriptionId} className="basalt-field-description">{description}</BaseField.Description>
        ) : null}
        {error ? <BaseField.Error id={`${id}-error`} className="basalt-field-error" match={invalid ? true : undefined}>{error}</BaseField.Error> : null}
        {sizers.map((text) => <span key={text} className="basalt-field-sizer" aria-hidden="true" inert>{text}</span>)}
      </div>
    </>
  );
}

/**
 * A labelled form field: label, control, description and error, wired together. A control that is a group (a `SegmentedControl`) is named by the label, with "Required" said after
 * it in a required field, and described by the description and, while the field is `invalid`, the error. In a `FormGrid` it takes `column`, `row` and `rows`.
 */
export function Field({ label, required, optional, requiredLabel = "Required", optionalLabel = "Optional", labelAction, description, error, reserveError: reserveOwn, children, className, style, column, row, rows, ...props }: FieldProps) {
  const reserveDefault = React.useContext(ReserveErrorsContext);
  const reserve = reserveOwn ?? reserveDefault ?? false;
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
      {reserve !== false ? (
        <BaseField.Validity>
          {(state) => (
            <ReservedField valid={state.validity.valid} id={id} description={description} error={error} invalid={props.invalid} disabled={props.disabled} reserve={reserve} required={Boolean(required)} requiredLabel={requiredLabel}>
              {children}
            </ReservedField>
          )}
        </BaseField.Validity>
      ) : <>
      <FieldGroupContext.Provider value={group}>
        <FieldRequiredContext.Provider value={Boolean(required)}>{children}</FieldRequiredContext.Provider>
      </FieldGroupContext.Provider>
      {description ? <BaseField.Description id={group.descriptionId} className="basalt-field-description">{description}</BaseField.Description> : null}
      {error ? <BaseField.Error id={group.errorId} className="basalt-field-error" match={props.invalid ? true : undefined}>{error}</BaseField.Error> : null}
      </>}
    </BaseField.Root>
  );
}
