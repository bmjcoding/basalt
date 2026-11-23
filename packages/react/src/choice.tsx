import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { MinusGlyph } from "./glyphs/minus";
import type { ControlSize } from "./button";
import type { ChangeDetails, ChoiceValue, OpenChangeDetails, PartProps, PopupActions } from "./types";
import { useFieldsetDisabled } from "./fieldset-context";
import { useMirrorRef } from "./mirror";
import { Icon } from "./icon";
import { GlidePlate } from "./plate";
import { join, withClass } from "./utils";
import { useFloatingLayer, usePopupLevel } from "./layers";

// ---- Checkbox ----

export interface CheckboxProps extends PartProps<"span", "onChange" | "defaultChecked" | "children" | "value"> {
  id?: string;
  /** Set to false when `render` produces something other than a native `<button>`. */
  nativeButton?: boolean;
  name?: string;
  form?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Neither checked nor unchecked: a parent of partly selected children. */
  indeterminate?: boolean;
  /** Controls the checkboxes of a group as a whole. */
  parent?: boolean;
  value?: string;
  /** What a form submits when the box is unchecked. Nothing by default. */
  uncheckedValue?: string;
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** The label, clickable with the box. Omit only when the checkbox is labelled another way (e.g. a table row's `aria-label`). */
  children?: React.ReactNode;
}

/** An on/off choice that takes effect when a form is submitted, or one of several independent options. */
export function Checkbox({ children, className, disabled, inputRef, ...props }: CheckboxProps) {
  const fieldsetDisabled = useFieldsetDisabled();
  const mirror = useMirrorRef(inputRef);
  const box = (
    <BaseCheckbox.Root {...props} inputRef={mirror} disabled={disabled || fieldsetDisabled} className={withClass("basalt-checkbox", className)}>
      <BaseCheckbox.Indicator
        className="basalt-checkbox-indicator"
        keepMounted
        render={(p, state) => (
          // An unchecked box draws no glyph (the indicator is `display: none` until it is checked, so nothing shows either way): it is made when the box is checked, on the server and in the browser.
          <span {...p}>{state.indeterminate ? <Icon icon={MinusGlyph} size={16} /> : state.checked ? <Icon icon={CheckGlyph} size={16} /> : null}</span>
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

export interface SwitchProps extends PartProps<"span", "onChange" | "defaultChecked" | "children"> {
  id?: string;
  /** Set to false when `render` produces something other than a native `<button>`. */
  nativeButton?: boolean;
  name?: string;
  form?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: string;
  uncheckedValue?: string;
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /**
   * A line of help drawn under the switch's row in a `Field` description's style (`text-xs`, secondary ink), starting at the column's start edge (not indented past the
   * switch) and linked to the switch with `aria-describedby` (DECISIONS 242). Needs a label (`children`). Its words may be a `Reserve`, and then hold their room.
   */
  description?: React.ReactNode;
  /** The label. A switch takes effect immediately; name the setting, not the action ("Auto-deploy", not "Turn on"). */
  children?: React.ReactNode;
}

/** A setting that takes effect immediately, on or off. */
export function Switch({ children, className, disabled, inputRef, description, "aria-describedby": describedby, ...props }: SwitchProps) {
  const fieldsetDisabled = useFieldsetDisabled();
  const mirror = useMirrorRef(inputRef);
  const id = React.useId();
  const helped = children !== undefined && description !== undefined && description !== null && description !== false;
  const control = (
    <BaseSwitch.Root {...props} aria-describedby={helped ? join(describedby, id) : describedby} inputRef={mirror} disabled={disabled || fieldsetDisabled} className={withClass("basalt-switch", className)}>
      <BaseSwitch.Thumb className="basalt-switch-thumb" />
    </BaseSwitch.Root>
  );
  if (children === undefined) return control;
  const row = (
    <label className="basalt-choice">
      {control}
      <span className="basalt-choice-label">{children}</span>
    </label>
  );
  if (!helped) return row;
  return (
    <div className="basalt-switch-field">
      {row}
      <p id={id} className="basalt-field-description basalt-switch-description">{description}</p>
    </div>
  );
}

// ---- RadioGroup ----

export interface RadioGroupProps<Value extends ChoiceValue = string> extends PartProps<"div", "defaultValue" | "value"> {
  name?: string;
  form?: string;
  /** The chosen radio's `value`; `null` when none is chosen yet. */
  value?: Value | null;
  defaultValue?: Value | null;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onValueChange?: (value: Value, details: ChangeDetails) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Required unless the group is labelled by a visible heading via `aria-labelledby`. */
  "aria-label"?: string;
}

/** One choice among a few options, all visible. For more than five or so, use `Select`. */
export function RadioGroup<Value extends ChoiceValue = string>({ className, disabled, value, defaultValue, ...props }: RadioGroupProps<Value>) {
  const fieldsetDisabled = useFieldsetDisabled();
  // `null` is "none chosen yet": Base UI accepts it, though its own type leaves it out.
  return <BaseRadioGroup {...props} value={value as Value | undefined} defaultValue={defaultValue as Value | undefined} disabled={disabled || fieldsetDisabled} className={withClass("basalt-radio-group", className)} />;
}

export interface RadioProps extends PartProps<"span", "children" | "defaultValue" | "value"> {
  value: ChoiceValue;
  /** Set to false when `render` produces something other than a native `<button>`. */
  nativeButton?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  children: React.ReactNode;
}

export function Radio({ children, className, disabled, inputRef, ...props }: RadioProps) {
  const fieldsetDisabled = useFieldsetDisabled();
  const mirror = useMirrorRef(inputRef);
  return (
    <label className="basalt-choice">
      <BaseRadio.Root {...props} inputRef={mirror} disabled={disabled || fieldsetDisabled} className={withClass("basalt-radio", className)}>
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
  /** A second line under the label (13/18, tertiary, one line). Use it only when the label can't tell the choices apart. It follows the label in the option's name. */
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  name?: string;
  form?: string;
  id?: string;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** Imperative handle: `unmount()` ends a closing animation you ran yourself (call `details.preventUnmountOnClose()` first); `close()` closes. */
  actionsRef?: React.RefObject<PopupActions | null>;
  modal?: boolean;
  highlightItemOnHover?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, details: ChangeDetails) => void;
  /** Shown when nothing is selected. */
  placeholder?: string;
  controlSize?: ControlSize;
  /** The trigger's accessible name when the select isn't inside a `Field`. */
  "aria-label"?: string;
  /**
   * A short label drawn before the value inside the trigger, in secondary ink, on the trigger's one line ("Go to": a Select whose choice goes somewhere). The
   * form is the multi-select trigger's, a label then its value. The visible words are part of the trigger's name: it reads the prefix, then the value, and
   * `aria-label` is not used (WCAG 2.5.3). The trigger's height and the value's place do not change with it.
   */
  valuePrefix?: string;
  /**
   * The options are numbers (a page size: 10, 25, 50, 100). The trigger is as wide as its widest option, below `size-select-min`, and does not follow the
   * chosen value's width: every option is drawn in the trigger's one cell, unseen, so choosing moves nothing beside it.
   */
  numeric?: boolean;
  /**
   * Use in a toolbar row: the trigger is as wide as its widest option (or the placeholder), not its container's width, so two selects and a search share a row,
   * and choosing never moves what follows it. Every option's label is laid out unseen in the value's one cell, as `MultiSelect toolbar` does. In a column
   * narrower than that it fills the column and cuts the value with an ellipsis. For numbers, use `numeric`.
   */
  toolbar?: boolean;
  className?: string;
}

/**
 * One choice from a list too long for radios. Inside a `Field` it takes the field's label.
 * The list opens below the trigger, like a menu.
 */
export function Select({ options, placeholder = "Select…", controlSize = "md", className, "aria-label": ariaLabel, valuePrefix, numeric, toolbar, inputRef, ...props }: SelectProps) {
  const mirror = useMirrorRef(inputRef);
  const ids = { prefix: React.useId(), value: React.useId() };
  const layer = useFloatingLayer();
  const level = usePopupLevel();
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  // A toolbar select holds the width of its widest label: each option (and the placeholder) stands unseen in the value's one cell, so choosing moves nothing after it.
  const value = <BaseSelect.Value id={valuePrefix ? ids.value : undefined} className="basalt-select-value" placeholder={placeholder} />;
  const seat = toolbar ? (
    <span className="basalt-select-seat">
      {value}
      {[placeholder, ...options.map((o) => o.label)].map((label, i) => <span key={i} aria-hidden="true">{label}</span>)}
    </span>
  ) : null;
  return (
    <BaseSelect.Root {...props} inputRef={mirror} items={items}>
      <BaseSelect.Trigger aria-label={valuePrefix ? undefined : ariaLabel} aria-labelledby={valuePrefix ? `${ids.prefix} ${ids.value}` : undefined} data-size={controlSize} className={join("basalt-select-trigger", className)}>
        {valuePrefix ? (
          <span className="basalt-select-lead">
            <span id={ids.prefix} className="basalt-select-prefix">{valuePrefix}</span>
            {seat ?? value}
          </span>
        ) : seat ? (
          seat
        ) : (
          // A numeric select holds the width of its widest option: the value's cell carries it as eights in an attribute that a pseudo-element paints, so choosing moves nothing and the DOM holds the words once.
          <BaseSelect.Value data-widest={numeric ? "8".repeat(Math.max(...options.map((o) => String(o.label).length))) : undefined} className="basalt-select-value" placeholder={placeholder} />
        )}
        <BaseSelect.Icon className="basalt-select-icon">
          <Icon icon={CaretUpDownIcon} size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="basalt-positioner" style={layer} sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup data-level={level} className="basalt-menu basalt-select-popup">
            <GlidePlate />
            <BaseSelect.List>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} disabled={o.disabled} data-described={o.description ? "" : undefined} data-lead="" className="basalt-menu-item basalt-select-item">
                  {/* The chosen value's check sits in a 16px slot at the row's start, reserved on every row so labels align. */}
                  <span className="basalt-menu-check">
                    <BaseSelect.ItemIndicator className="basalt-select-check">
                      <Icon icon={CheckGlyph} size={16} />
                    </BaseSelect.ItemIndicator>
                  </span>
                  <BaseSelect.ItemText className="basalt-menu-item-label">{o.label}</BaseSelect.ItemText>
                  {o.description ? <span className="basalt-menu-item-description">{o.description}</span> : null}
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
