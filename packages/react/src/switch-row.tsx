import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { PlusGlyph } from "./glyphs/plus";
import { Icon } from "./icon";
import type { ChangeDetails, PartProps } from "./types";
import { useMirrorRef } from "./mirror";
import { withClass } from "./utils";

export interface SwitchRowGroupProps extends PartProps<"div", "defaultValue" | "value" | "onChange"> {
  /** The values of the rows that are on. */
  value?: string[];
  defaultValue?: string[];
  /** Called with every row that is on, in the order they were turned on. Call `details.cancel()` to refuse. */
  onValueChange?: (value: string[], details: ChangeDetails) => void;
  disabled?: boolean;
  /**
   * Required unless a visible heading names the group through `aria-labelledby`. Describe it with a hint through `aria-describedby`. The
   * group is not a filter: it has no count, no Clear and no seven-or-more rule. What switching rows does to the page is said by one
   * `FilterResult` (which holds for 400ms, so three switches in a row are one announcement).
   */
  "aria-label"?: string;
}

/** A group of switch rows: each is one checkbox, and the group is named and described like one. A column; the app lays rows out in more. */
export function SwitchRowGroup({ className, ...props }: SwitchRowGroupProps) {
  return <BaseCheckboxGroup {...props} className={withClass("basalt-switch-rows", className)} />;
}

export interface SwitchRowProps extends PartProps<"span", "children" | "value" | "defaultChecked" | "onChange"> {
  /** What this row is called in the group's value. */
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  form?: string;
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void;
  /** The row's hidden form input, as `Checkbox` has it (it was passed through before; now it is typed). */
  inputRef?: React.Ref<HTMLInputElement>;
  /**
   * What the row is of: an app's icon or a logo, 36px square (32 under 720px wide), drawn by the app. It is decorative: the name says it.
   * Without one the row starts with its name.
   */
  tile?: React.ReactNode;
  /** The kind, after the name ("Watch", "Ring"). It is part of the row's name, after a comma. */
  kind?: React.ReactNode;
  /** The name: one line that ends in an ellipsis. It is the row's accessible name. */
  children: React.ReactNode;
}

/**
 * A row that is one checkbox (DECISIONS 154, D9): an optional tile, a name and a kind, and a 16px seat where a plus (off) and a
 * check (on) cross over, so turning a row on moves nothing and is never colour alone. Off is secondary ink on an input-boundary edge;
 * on is the selected wash and primary ink. 52px tall from 720px wide and 48px under it, whatever it holds. Use it where a person
 * switches things on and each carries more than a word (a device, a source, a plan); one value among words alone is a chip
 * (`MultiSelect`), and a setting that applies at once is a `Switch`.
 */
export function SwitchRow({ tile, kind, children, className, inputRef, ...props }: SwitchRowProps) {
  const mirror = useMirrorRef(inputRef);
  return (
    <BaseCheckbox.Root {...props} inputRef={mirror} nativeButton render={<button type="button" />} data-tile={tile ? "" : undefined} className={withClass("basalt-switch-row", className)}>
      {tile ? <span className="basalt-switch-row-tile" aria-hidden="true">{tile}</span> : null}
      <span className="basalt-switch-row-text">
        {/* The comma is the name's, so the row's name reads "Name, Kind" whatever the two blocks' spacing. */}
        <span className="basalt-switch-row-name">{children}{kind ? <span className="basalt-visually-hidden">, </span> : null}</span>
        {kind ? <span className="basalt-switch-row-kind">{kind}</span> : null}
      </span>
      {/* One 16px seat, both glyphs stacked in it: the plus and the check cross-fade. */}
      <span className="basalt-switch-row-seat" aria-hidden="true">
        <Icon icon={PlusGlyph} className="basalt-switch-row-plus" />
        <Icon icon={CheckGlyph} className="basalt-switch-row-check" />
      </span>
    </BaseCheckbox.Root>
  );
}
