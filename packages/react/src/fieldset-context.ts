import * as React from "react";

// A disabled Fieldset disables the choices inside it. Base UI shares the flag only with its own
// Field, and its context isn't public, so Basalt carries it: Checkbox, Switch and Radio read it
// here. A module of its own keeps a choice-only import from loading the form controls.
const FieldsetDisabled = /* @__PURE__ */ React.createContext(false);

export const FieldsetDisabledProvider = FieldsetDisabled.Provider;

/** True inside a disabled Fieldset, however deeply nested. */
export function useFieldsetDisabled() {
  return React.useContext(FieldsetDisabled);
}
