// A theme switch changes colour at once (DECISIONS 420). Internal: theme.ts and a palette store import it. Nothing runs at import.

/**
 * Runs one theme write inside a window where every transition's duration and delay is zero (`data-theme-switching` on the root; the rule is in
 * components.css, in `@layer basalt`, with `!important`). The window is synchronous: set the attribute, write, flush style, remove it, in this call. So a
 * colour the theme changes snaps, a movement already running (its property still listed, its end value unchanged) finishes on its own time, and no
 * animation is touched. What the choice itself moves afterwards (the theme choice's pill, a closing menu) transitions as usual.
 */
export function withoutTransitions(write: () => void): void {
  const root = document.documentElement;
  root.setAttribute("data-theme-switching", "");
  try {
    write();
    // The flush: this style change applies the new colours while every duration is zero.
    void getComputedStyle(root).color;
  } finally {
    root.removeAttribute("data-theme-switching");
  }
}
