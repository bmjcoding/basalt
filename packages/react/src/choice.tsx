import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { CaretUpDownIcon, CheckIcon, MinusIcon } from "@phosphor-icons/react";
import * as React from "react";

import type { ControlSize } from "./button";
import { Icon } from "./icon";
import { join, withClass } from "./utils";

// ---- Checkbox ----

export interface CheckboxProps extends Omit<React.ComponentProps<typeof BaseCheckbox.Root>, "children"> {
  /** The label, clickable with the box. Omit only when the checkbox is labelled another way (e.g. a table row's `aria-label`). */
  children?: React.ReactNode;
}

/** An on/off choice that takes effect when a form is submitted, or one of several independent options. */
export function Checkbox({ children, className, ...props }: CheckboxProps) {
  const box = (
    <BaseCheckbox.Root {...props} className={withClass("basalt-checkbox", className)}>
      <BaseCheckbox.Indicator
        className="basalt-checkbox-indicator"
        keepMounted
        render={(p, state) => (
          <span {...p}>{state.indeterminate ? <Icon icon={MinusIcon} size={16} /> : <Icon icon={CheckIcon} size={16} />}</span>
        )}
      />
    </BaseCheckbox.Root>
  );
  if (children === undefined) return box;
  return (
    <label className="basalt-choice">
      {box}
      <span className="basalt-choice-label">{children}</span>
    </label>
  );
}

// ---- Switch ----

export interface SwitchProps extends Omit<React.ComponentProps<typeof BaseSwitch.Root>, "children"> {
  /** The label. A switch takes effect immediately; name the setting, not the action ("Auto-deploy", not "Turn on"). */
  children?: React.ReactNode;
}

/** A setting that takes effect immediately, on or off. */
export function Switch({ children, className, ...props }: SwitchProps) {
  const control = (
    <BaseSwitch.Root {...props} className={withClass("basalt-switch", className)}>
      <BaseSwitch.Thumb className="basalt-switch-thumb" />
    </BaseSwitch.Root>
  );
  if (children === undefined) return control;
  return (
    <label className="basalt-choice">
      {control}
      <span className="basalt-choice-label">{children}</span>
    </label>
  );
}

// ---- RadioGroup ----

export interface RadioGroupProps extends React.ComponentProps<typeof BaseRadioGroup> {
  /** Required unless the group is labelled by a visible heading via `aria-labelledby`. */
  "aria-label"?: string;
}

/** One choice among a few options, all visible. For more than five or so, use `Select`. */
export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <BaseRadioGroup {...props} className={withClass("basalt-radio-group", className)} />;
}

export interface RadioProps extends Omit<React.ComponentProps<typeof BaseRadio.Root>, "children"> {
  value: string;
  children: React.ReactNode;
}

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <label className="basalt-choice">
      <BaseRadio.Root {...props} className={withClass("basalt-radio", className)}>
        <BaseRadio.Indicator className="basalt-radio-indicator" />
      </BaseRadio.Root>
      <span className="basalt-choice-label">{children}</span>
    </label>
  );
}

// ---- Select ----

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.ComponentProps<typeof BaseSelect.Root>, "items" | "children" | "value" | "defaultValue" | "onValueChange"> {
  options: SelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Shown when nothing is selected. */
  placeholder?: string;
  controlSize?: ControlSize;
  /** The trigger's accessible name when the select isn't inside a `Field`. */
  "aria-label"?: string;
  className?: string;
}

/**
 * One choice from a list too long for radios. Inside a `Field` it takes the field's label.
 * The list opens below the trigger, like a menu.
 */
export function Select({ options, placeholder = "Select…", controlSize = "md", className, "aria-label": ariaLabel, onValueChange, ...props }: SelectProps) {
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  return (
    <BaseSelect.Root {...props} items={items} onValueChange={onValueChange ? (v) => onValueChange(v as string | null) : undefined}>
      <BaseSelect.Trigger aria-label={ariaLabel} data-size={controlSize} className={join("basalt-select-trigger", className)}>
        <BaseSelect.Value className="basalt-select-value" placeholder={placeholder} />
        <BaseSelect.Icon className="basalt-select-icon">
          <Icon icon={CaretUpDownIcon} size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="basalt-positioner" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="basalt-menu basalt-select-popup">
            <BaseSelect.List>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} disabled={o.disabled} className="basalt-menu-item basalt-select-item">
                  <BaseSelect.ItemText className="basalt-menu-item-label">{o.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="basalt-select-check">
                    <Icon icon={CheckIcon} size={16} />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
