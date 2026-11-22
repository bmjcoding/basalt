import * as React from "react";

/**
 * What a `Field` tells a control that is a group, not one input (a `SegmentedControl`): the ids of its label, description and error, so the group can be named and described by
 * them (a `<label for>` cannot name a group), and whether the field is required or invalid. Built lazily, so loading the module does nothing.
 */
export interface FieldGroup {
  labelId: string;
  descriptionId: string | undefined;
  errorId: string | undefined;
  required: boolean;
  requiredLabel: string;
  invalid: boolean;
}

export const FieldGroupContext = /* @__PURE__ */ React.createContext<FieldGroup | null>(null);
