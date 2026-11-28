import * as React from "react";

/**
 * A `Form`'s or a `FormGrid`'s `reserveErrors`: the default `reserveError` of the fields inside (cimip-gaps-3 t4, item 1). A field's own `reserveError`,
 * `false` included, wins. `undefined` outside both.
 */
export const ReserveErrorsContext = /* @__PURE__ */ React.createContext<boolean | undefined>(undefined);
