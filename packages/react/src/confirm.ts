import * as React from "react";

import { CONFIRM_MS } from "./constants";

/**
 * A confirmation that clears itself. `confirmed` is true for `CONFIRM_MS` after `confirm()` is called, and calling it again
 * while it holds starts the hold over. The timer is cleared when the component unmounts. Pass `confirmed` to `IconButton`'s
 * `done` and say what happened in a `StatusLine` outside the button.
 */
export function useConfirm(ms: number = CONFIRM_MS): [confirmed: boolean, confirm: () => void] {
  const [confirmed, setConfirmed] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const confirm = React.useCallback(() => {
    clearTimeout(timer.current);
    setConfirmed(true);
    timer.current = setTimeout(() => setConfirmed(false), ms);
  }, [ms]);
  return [confirmed, confirm];
}
