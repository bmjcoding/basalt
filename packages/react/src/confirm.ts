import * as React from "react";

/**
 * How long a confirmation holds before it returns to rest, in milliseconds: the value of the `duration-confirm` token (1500). A
 * hold is not an animation, so reduced motion does not change it. A script cannot read a CSS token, so the number is written
 * here once, and the copy buttons and `IconButton`'s `done` state share it (DECISIONS 154, D11c).
 */
export const CONFIRM_MS = 1500;

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
