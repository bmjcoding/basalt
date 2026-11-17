import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { Form as BaseForm } from "@base-ui/react/form";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { MinusGlyph } from "./glyphs/minus";
import { PlusGlyph } from "./glyphs/plus";
import { IconButton, type ControlSize } from "./button";
import { FieldsetDisabledProvider, useFieldsetDisabled } from "./fieldset-context";
import { Icon } from "./icon";
import { GlidePlate } from "./plate";
import type { ChangeDetails, CommitDetails, HighlightDetails, OpenChangeDetails, PartProps, PopupActions, SubmitDetails, ValidateActions } from "./types";
import { join, withClass } from "./utils";
import { useFloatingLayer, usePopupLevel } from "./layers";

export type FormProps<Values extends Record<string, unknown> = Record<string, unknown>> = PartProps<"form"> & {
  /** When fields first show their errors. */
  validationMode?: "onSubmit" | "onBlur" | "onChange";
  /** Errors from outside the form, e.g. a server response, keyed by field name. */
  errors?: Record<string, string | string[]>;
  /** Called with the values of every named control once the form is valid. */
  onFormSubmit?: (values: Values, details: SubmitDetails) => void;
  /** Validate every field, or one by name, on demand: `actionsRef.current?.validate()`. */
  actionsRef?: React.RefObject<ValidateActions | null>;
};

export function Form<Values extends Record<string, unknown> = Record<string, unknown>>({ className, ...props }: FormProps<Values>) {
  return <BaseForm {...props} className={withClass("basalt-form", className)} />;
}

export interface FieldsetProps extends PartProps<"fieldset"> {
  legend: React.ReactNode;
  disabled?: boolean;
}

/** A named group of related fields. Disabling the group disables its controls. */
export function Fieldset({ legend, children, className, disabled = false, ...props }: FieldsetProps) {
  const disabledByParent = useFieldsetDisabled();
  return (
    <BaseFieldset.Root {...props} disabled={disabled || disabledByParent} className={withClass("basalt-fieldset", className)}>
      <FieldsetDisabledProvider value={disabled || disabledByParent}>
        <BaseFieldset.Legend className="basalt-fieldset-legend">{legend}</BaseFieldset.Legend>
        {children}
      </FieldsetDisabledProvider>
    </BaseFieldset.Root>
  );
}

export interface ComboboxOption {
  value: string;
  label: string;
  /** A second line under the label (13/18, tertiary, one line). Use it only when the label can't tell options apart. It is searched too, after the label. */
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, details: ChangeDetails) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string, details: ChangeDetails) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** Called as the highlight moves; the value is `undefined` when nothing is highlighted. */
  onItemHighlighted?: (value: string | undefined, details: HighlightDetails) => void;
  /** Imperative handle: `unmount()` ends a closing animation you ran yourself (call `details.preventUnmountOnClose()` first); `close()` closes. */
  actionsRef?: React.RefObject<PopupActions | null>;
  name?: string;
  form?: string;
  id?: string;
  /** The browser's autofill hint for the field, e.g. "email". */
  autoComplete?: string;
  /** Your own match test, over the option values: return false to hide one. `null` turns filtering off. */
  filter?: null | ((value: string, query: string, itemToString?: (value: string) => string) => boolean);
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** Open the list when the input is clicked, not only when it is typed in. */
  openOnInputClick?: boolean;
  /** Highlight the first match as you type, so Enter chooses it. */
  autoHighlight?: boolean;
  highlightItemOnHover?: boolean;
  loopFocus?: boolean;
  /** Show at most this many matches. */
  limit?: number;
  modal?: boolean;
  locale?: string | string[];
  inputRef?: React.Ref<HTMLInputElement>;
  placeholder?: string;
  emptyMessage?: string;
  controlSize?: ControlSize;
  className?: string;
  "aria-label"?: string;
  inputProps?: Omit<React.ComponentProps<"input">, "className" | "value" | "defaultValue" | "children">;
}

/** A searchable Select. The chosen value must come from the supplied options. Label it with Field. */
export function Combobox({ options, placeholder = "Search…", emptyMessage = "No options match.", controlSize = "md", className, inputProps, modal = false, "aria-label": label, ...props }: ComboboxProps) {
  const layer = useFloatingLayer();
  const level = usePopupLevel();
  const byValue = new Map(options.map((option) => [option.value, option]));
  // A description is a search keyword: with none given, a typed query also finds the words under a label.
  const described = options.some((option) => option.description);
  const describedFilter = (value: string, query: string) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const option = byValue.get(value);
    return `${option?.label ?? value}`.toLowerCase().includes(needle) || (option?.description?.toLowerCase().includes(needle) ?? false);
  };
  return (
    <BaseCombobox.Root {...(described && props.filter === undefined ? { filter: describedFilter } : null)} {...props} modal={modal} items={options.map((option) => option.value)} itemToStringLabel={(value) => byValue.get(value)?.label ?? value}>
      <BaseCombobox.InputGroup className={join("basalt-combobox", className)}>
        <BaseCombobox.Input {...inputProps} aria-label={label ?? inputProps?.["aria-label"]} placeholder={placeholder} data-size={controlSize} className="basalt-input basalt-combobox-input" />
        <BaseCombobox.Trigger render={<IconButton icon={CaretUpDownIcon} label="Show options" size={controlSize} />} className="basalt-combobox-trigger" />
      </BaseCombobox.InputGroup>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={6} style={layer} className="basalt-positioner">
          <BaseCombobox.Popup data-level={level} className="basalt-menu basalt-combobox-popup">
            <GlidePlate />
            <BaseCombobox.Empty className="basalt-combobox-empty">{emptyMessage}</BaseCombobox.Empty>
            <BaseCombobox.List>
              {(value: string) => (
                <BaseCombobox.Item key={value} value={value} disabled={byValue.get(value)?.disabled} data-described={byValue.get(value)?.description ? "" : undefined} data-lead="" className="basalt-menu-item">
                  <span className="basalt-menu-check"><BaseCombobox.ItemIndicator className="basalt-select-check"><Icon icon={CheckGlyph} size={16} /></BaseCombobox.ItemIndicator></span>
                  <span className="basalt-menu-item-label">{byValue.get(value)?.label ?? value}</span>
                  {byValue.get(value)?.description ? <span className="basalt-menu-item-description">{byValue.get(value)?.description}</span> : null}
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}

export interface NumberFieldProps extends PartProps<"div", "onChange" | "defaultValue" | "children" | "value"> {
  value?: number | null;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number | "any";
  /** Step used with Alt held. */
  smallStep?: number;
  /** Step used with Shift held or Page Up and Down. */
  largeStep?: number;
  allowOutOfRange?: boolean;
  allowWheelScrub?: boolean;
  snapOnStep?: boolean;
  /** How the number is written, as `Intl.NumberFormat` options. */
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
  id?: string;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: (value: number | null, details: ChangeDetails) => void;
  onValueCommitted?: (value: number | null, details: CommitDetails) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  controlSize?: ControlSize;
  "aria-label"?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  inputProps?: Omit<React.ComponentProps<"input">, "className" | "value" | "defaultValue">;
}

/** Numeric entry with locale-aware formatting and bounded keyboard/button stepping. */
export function NumberField({ controlSize = "md", className, inputProps, "aria-label": label, decrementLabel = "Decrease value", incrementLabel = "Increase value", ...props }: NumberFieldProps) {
  return (
    <BaseNumberField.Root {...props} className={withClass("basalt-number", className)}>
      <BaseNumberField.Group className="basalt-number-group" data-size={controlSize}>
        <BaseNumberField.Decrement aria-label={decrementLabel} render={<IconButton icon={MinusGlyph} label={decrementLabel} size={controlSize} />} />
        <BaseNumberField.Input {...inputProps} aria-label={label ?? inputProps?.["aria-label"]} className="basalt-input basalt-number-input" data-size={controlSize} />
        <BaseNumberField.Increment aria-label={incrementLabel} render={<IconButton icon={PlusGlyph} label={incrementLabel} size={controlSize} />} />
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}

export type SliderProps<Value extends number | readonly number[] = number> = PartProps<"div", "defaultValue" | "value" | "children"> & {
  value?: Value;
  defaultValue?: Value;
  min?: number;
  max?: number;
  step?: number;
  largeStep?: number;
  /** The least distance allowed between range thumbs. */
  minStepsBetweenValues?: number;
  orientation?: "horizontal" | "vertical";
  /** Whether a thumb's edge or its centre stops at the ends of the track. */
  thumbAlignment?: "center" | "edge" | "edge-client-only";
  /** What range thumbs do when one meets another. */
  thumbCollisionBehavior?: "push" | "swap" | "none";
  disabled?: boolean;
  name?: string;
  form?: string;
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
  onValueChange?: (value: Value extends number ? number : Value, details: ChangeDetails) => void;
  onValueCommitted?: (value: Value extends number ? number : Value, details: CommitDetails) => void;
  label: string;
  showValue?: boolean;
  /** Names for each range thumb, e.g. ["Minimum budget", "Maximum budget"]. */
  thumbLabels?: readonly string[];
  /** The spoken value of a thumb, e.g. "$20". */
  getValueText?: (formattedValue: string, value: number, index: number) => string;
};

/**
 * The slider's printed value is `aria-hidden` (the thumb says its own value), and Base UI still marks its `output` `aria-live="off"`.
 * An element holding any `aria-live` stays in the accessibility tree behind an open modal, so the attribute is dropped here.
 */
function withoutLive({ "aria-live": _live, ...props }: React.ComponentProps<"output">) {
  return <output {...props} />;
}

/** A bounded scalar or range; arrow keys step, Home/End jump to bounds. */
export function Slider<Value extends number | readonly number[]>({ label, showValue = true, thumbLabels, getValueText, className, ...props }: SliderProps<Value>) {
  const labelId = React.useId();
  const value = props.value ?? props.defaultValue ?? 0;
  const count = Array.isArray(value) ? value.length : 1;
  return (
    <BaseSlider.Root {...props} className={withClass("basalt-slider", className)}>
      <div className="basalt-progress-head">
        <span id={labelId} className="basalt-progress-label">{label}</span>
        {showValue ? <BaseSlider.Value className="basalt-progress-value" aria-hidden="true" render={withoutLive} /> : null}
      </div>
      <BaseSlider.Control className="basalt-slider-control">
        <BaseSlider.Track className="basalt-slider-track">
          <BaseSlider.Indicator className="basalt-slider-indicator" />
          {Array.from({ length: count }, (_, index) => (
            <BaseSlider.Thumb key={index} index={index} className="basalt-slider-thumb" aria-labelledby={count === 1 && !thumbLabels ? labelId : undefined} getAriaLabel={thumbLabels || count > 1 ? () => thumbLabels?.[index] ?? `${label} ${index + 1}` : undefined} getAriaValueText={getValueText} />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
