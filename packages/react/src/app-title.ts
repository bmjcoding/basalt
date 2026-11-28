import * as React from "react";

// The page's title on a phone (cimip-gaps-3 T5, item 2). With `AppHeader phoneTitle="page"` the bar's own `h1` is not drawn under 720 and the page's
// head (`AppPageHead phoneOnly`, first in the shell's `main`) is the title there. `AppShell` renders the header and `main` as siblings, so the bar
// finds the page's heading through this context: the head registers its `h1` when it mounts (and again when a page change replaces it), and the bar
// reads it in an effect. No id, no document query, and the shell never reads the header's type or props. Outside an `AppShell` there is none.

export interface AppTitleContextValue {
  /** The page's phone-only heading, while one is mounted. */
  heading: HTMLElement | null;
  /** A phone-only head registers its `h1` (and `null` as it goes). */
  setHeading: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
}

export const AppTitleContext = /* @__PURE__ */ React.createContext<AppTitleContextValue | null>(null);

/** Whether an element is displayed now: it has a box (`display: none` on it or an ancestor gives none). */
const displayed = (element: HTMLElement | null | undefined): element is HTMLElement => !!element && element.isConnected && element.getClientRects().length > 0;

/**
 * A `FocusPlace` for `useRouteFocus`'s `target` when a page's title is drawn in two places (the bar's `h1` from 720 and the page's own `AppPageHead`
 * under it): it returns the one that is displayed, read when focus is sent. Give it each heading's ref, in any order; the first one shown wins.
 * When none is shown yet (the page's head arrives with its data) it returns `null`, and `useRouteFocus` lands when one arrives.
 */
export function shownHeading(...refs: readonly React.RefObject<HTMLElement | null>[]): () => HTMLElement | null {
  return () => refs.map((ref) => ref.current).find(displayed) ?? null;
}

export { displayed as isDisplayed };
