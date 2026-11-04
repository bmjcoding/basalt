import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { Form as BaseForm } from "@base-ui/react/form";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { CaretUpDownIcon, CheckIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import * as React from "react";

import { IconButton, type ControlSize } from "./button";
import { Icon } from "./icon";
import { join, withClass } from "./utils";
import { useFloatingLayer } from "./layers";

export function Form<Values extends Record<string, unknown> = Record<string, unknown>>({ className, ...props }: BaseForm.Props<Values>) {
  return <BaseForm {...props} className={withClass("basalt-form", className)} />;
}

export interface FieldsetProps extends React.ComponentProps<typeof BaseFieldset.Root> {
  legend: React.ReactNode;
}

/** A named group of related fields. Disabling the group disables its controls. */
export function Fieldset({ legend, children, className, ...props }: FieldsetProps) {
  return (
    <BaseFieldset.Root {...props} className={withClass("basalt-fieldset", className)}>
      <BaseFieldset.Legend className="basalt-fieldset-legend">{legend}</BaseFieldset.Legend>
      {children}
    </BaseFieldset.Root>
  );
}

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps extends Omit<BaseCombobox.Root.Props<string>, "items" | "children" | "itemToStringLabel" | "itemToStringValue"> {
  options: readonly ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  controlSize?: ControlSize;
  className?: string;
  "aria-label"?: string;
  inputProps?: Omit<React.ComponentProps<typeof BaseCombobox.Input>, "className" | "value" | "defaultValue" | "children">;
}

/** A searchable Select. The chosen value must come from the supplied options. Label it with Field. */
export function Combobox({ options, placeholder = "Search…", emptyMessage = "No options match.", controlSize = "md", className, inputProps, modal = false, "aria-label": label, ...props }: ComboboxProps) {
  const layer = useFloatingLayer();
  const byValue = new Map(options.map((option) => [option.value, option]));
  return (
    <BaseCombobox.Root {...props} modal={modal} items={options.map((option) => option.value)} itemToStringLabel={(value) => byValue.get(value)?.label ?? value}>
      <BaseCombobox.InputGroup className={join("basalt-combobox", className)}>
        <BaseCombobox.Input {...inputProps} aria-label={label ?? inputProps?.["aria-label"]} placeholder={placeholder} data-size={controlSize} className="basalt-input basalt-combobox-input" />
        <BaseCombobox.Trigger render={<IconButton icon={CaretUpDownIcon} label="Show options" size={controlSize} />} className="basalt-combobox-trigger" />
      </BaseCombobox.InputGroup>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={6} style={layer} className="basalt-positioner">
          <BaseCombobox.Popup className="basalt-menu basalt-combobox-popup">
            <BaseCombobox.Empty className="basalt-combobox-empty">{emptyMessage}</BaseCombobox.Empty>
            <BaseCombobox.List>
              {(value: string) => (
                <BaseCombobox.Item key={value} value={value} disabled={byValue.get(value)?.disabled} className="basalt-menu-item">
                  <span className="basalt-menu-item-label">{byValue.get(value)?.label ?? value}</span>
                  <BaseCombobox.ItemIndicator><Icon icon={CheckIcon} size={16} /></BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}

export interface NumberFieldProps extends Omit<React.ComponentProps<typeof BaseNumberField.Root>, "children"> {
  controlSize?: ControlSize;
  "aria-label"?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  inputProps?: Omit<React.ComponentProps<typeof BaseNumberField.Input>, "className" | "value" | "defaultValue">;
}

/** Numeric entry with locale-aware formatting and bounded keyboard/button stepping. */
export function NumberField({ controlSize = "md", className, inputProps, "aria-label": label, decrementLabel = "Decrease value", incrementLabel = "Increase value", ...props }: NumberFieldProps) {
  return (
    <BaseNumberField.Root {...props} className={withClass("basalt-number", className)}>
      <BaseNumberField.Group className="basalt-number-group">
        <BaseNumberField.Decrement aria-label={decrementLabel} render={<IconButton icon={MinusIcon} label={decrementLabel} size={controlSize} />} />
        <BaseNumberField.Input {...inputProps} aria-label={label ?? inputProps?.["aria-label"]} className="basalt-input basalt-number-input" data-size={controlSize} />
        <BaseNumberField.Increment aria-label={incrementLabel} render={<IconButton icon={PlusIcon} label={incrementLabel} size={controlSize} />} />
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}

export type SliderProps<Value extends number | readonly number[] = number> = Omit<BaseSlider.Root.Props<Value>, "children"> & {
  label: string;
  showValue?: boolean;
  /** Names for each range thumb, e.g. ["Minimum budget", "Maximum budget"]. */
  thumbLabels?: readonly string[];
  getValueText?: React.ComponentProps<typeof BaseSlider.Thumb>["getAriaValueText"];
};

/** A bounded scalar or range; arrow keys step, Home/End jump to bounds. */
export function Slider<Value extends number | readonly number[]>({ label, showValue = true, thumbLabels, getValueText, className, ...props }: SliderProps<Value>) {
  const labelId = React.useId();
  const value = props.value ?? props.defaultValue ?? 0;
  const count = Array.isArray(value) ? value.length : 1;
  return (
    <BaseSlider.Root {...props} className={withClass("basalt-slider", className)}>
      <div className="basalt-progress-head">
        <span id={labelId} className="basalt-progress-label">{label}</span>
        {showValue ? <BaseSlider.Value className="basalt-progress-value" aria-hidden="true" /> : null}
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
