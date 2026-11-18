import * as React from "react";

import { StatusSizeContext } from "./status-size";
import { join } from "./utils";

export type SpinnerVariant = "ring" | "braille";

export interface SpinnerProps {
  /**
   * The ring is a square of this many pixels. Braille is a 6 by 10 cell at 16, 9 by 15 at 20 and 12 by 20 at 24, always on whole
   * pixels, and its size follows its word's cap height: 16 beside text of 12 to 16px, 20 beside 18 to 24px, 24 beside 30px and up.
   * Inside a plain `Badge` braille takes the badge's `size` instead, so the two cannot disagree.
   */
  size?: 16 | 20 | 24;
  /** What is loading, announced to screen readers: its text is in the spinner's status. Omit when a visible label beside it already says so. */
  label?: string;
  className?: string;
  /**
   * `ring` (the default) is for a wait: in a button, in the command menu's loading slot, or anywhere a spinner stands without a visible word.
   * `braille` is for a status: work that runs while a word beside it says so, in a table, a list row, a toast or a log line. Never in a button,
   * never without its word. It is Basalt's own six-dot cell stepping through ten frames in 800ms, in its word's colour, and it takes the
   * status dot's place and gap. Under reduced motion the ring fades and braille holds its first frame.
   */
  variant?: SpinnerVariant;
}

// The dots of a braille cell, numbered as Unicode numbers them: 1 to 3 down the left column, 4 to 6 down the
// right. Basalt draws the six the frames use; dots 7 and 8 (the bottom row) are never lit, so they are not drawn.
// The ten frames ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ are in the stylesheet, each dot stepping between drawn (1) and not drawn (0). The first
// frame (⠋, dots 1, 2 and 4) is the base look, and how a held spinner appears.
const DOTS = [
  { dot: 1, x: 1, y: 1 }, { dot: 2, x: 1, y: 5 }, { dot: 3, x: 1, y: 9 },
  { dot: 4, x: 5, y: 1 }, { dot: 5, x: 5, y: 5 }, { dot: 6, x: 5, y: 9 },
] as const;
const FIRST_FRAME = [1, 2, 4];
// The cell scales on whole pixels: 6 by 10 with 2px dots, 9 by 15 with 3px dots, 12 by 20 with 4px dots.
const BRAILLE_SCALE = { 16: 1, 20: 1.5, 24: 2 } as const;

// The spinners mounted in the commit that is finishing, waiting to join the shared clock. Allocated by the first spinner, never at import.
let joining: HTMLElement[] | undefined;

/**
 * Spinners on a page share one clock: every animation starts at the document timeline's origin, so two spinners
 * mounted at different moments tick in phase, each variant on its own period. The spinners of one commit join it
 * together, in a microtask, before anything else runs and before the next paint: every spinner's animations are read
 * first and then written, because asking settles style and a write dirties it (a hundred spinners, asked and written
 * in turn, cost a hundred recalculations). Nothing is stored in React and no ticker runs. A server-rendered first
 * paint shows frame 0 and corrects once, here, after hydration. Under reduced motion braille runs no animation, so
 * there is nothing to sync.
 */
function useSharedClock(ref: React.RefObject<HTMLElement | null>) {
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getAnimations !== "function") return;
    if (!joining) {
      joining = [];
      queueMicrotask(() => {
        const animations = joining?.flatMap((spinner) => spinner.getAnimations({ subtree: true }));
        joining = undefined;
        for (const animation of animations ?? []) animation.startTime = 0;
      });
    }
    joining.push(el);
  }, [ref]);
}

/** Work in progress with no measurable end. Prefer `Progress` when you know how far along it is. */
export function Spinner({ size: sizeProp = 16, label, className, variant = "ring" }: SpinnerProps) {
  const inBadge = React.useContext(StatusSizeContext);
  const size = variant === "braille" ? inBadge ?? sizeProp : sizeProp;
  const ref = React.useRef<HTMLSpanElement>(null);
  useSharedClock(ref);
  const status = label ? ({ role: "status" as const, "aria-label": label }) : ({ "aria-hidden": true as const });
  const braille = variant === "braille";
  const scale = BRAILLE_SCALE[size];
  // One element for both variants, so a label is written once. A status that has a label has it twice: as its name, and as its text, because a polite region is
  // read for what is inside it and not for a name it carries.
  return (
    <span ref={ref} {...status} data-variant={variant} data-size={braille ? size : undefined} className={join("basalt-spinner", className)} style={braille ? undefined : { width: size, height: size }}>
      {braille ? (
        <svg viewBox="0 0 6 10" width={6 * scale} height={10 * scale} aria-hidden="true">
          {DOTS.map(({ dot, x, y }) => (
            <circle key={dot} className="basalt-spinner-dot" data-dot={dot} data-lit={FIRST_FRAME.includes(dot) ? "" : undefined} cx={x} cy={y} r={1} />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
          <path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {label ? <span className="basalt-visually-hidden">{label}</span> : null}
    </span>
  );
}
