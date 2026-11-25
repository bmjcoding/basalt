import * as React from "react";

/**
 * One callback ref that fills a component's own ref and the caller's `ref`, keeping React 19's ref cleanup: a callback ref that returns a function has it
 * called on detach, and one that returns nothing is called with `null`, as React would. A new `ref` from the caller detaches the old one and attaches the new.
 * Nothing runs when this module loads.
 */
export function useMergedRef<T>(own: React.RefObject<T | null>, given: React.Ref<T> | undefined): (element: T | null) => () => void {
  return React.useCallback(
    (element: T | null) => {
      own.current = element;
      let cleanup: unknown;
      if (typeof given === "function") cleanup = given(element);
      else if (given) (given as React.RefObject<T | null>).current = element;
      return () => {
        own.current = null;
        if (typeof cleanup === "function") cleanup();
        else if (typeof given === "function") given(null);
        else if (given) (given as React.RefObject<T | null>).current = null;
      };
    },
    [own, given],
  );
}
