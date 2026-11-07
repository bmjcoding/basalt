import { join } from "./utils";

export type SpinnerVariant = "ring" | "braille";

export interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** What is loading, announced to screen readers. Omit when a visible label beside it already says so. */
  label?: string;
  className?: string;
  /** `ring` (the default, also inside buttons) is the arc. `braille` is a 2 by 4 dot matrix stepping through ten frames, for mono and terminal lines. */
  variant?: SpinnerVariant;
}

// The dots of a braille cell, numbered as Unicode numbers them: 1 to 3 down the left column, 4 to 6 down
// the right, 7 and 8 the bottom row. The ten frames ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ never light 7 or 8. The stylesheet steps each
// dot's opacity through the frames; the first frame (⠋, dots 1, 2 and 4) is how a held spinner looks.
const DOTS = [
  { dot: 1, x: 5, y: 2 }, { dot: 2, x: 5, y: 6 }, { dot: 3, x: 5, y: 10 }, { dot: 7, x: 5, y: 14 },
  { dot: 4, x: 11, y: 2 }, { dot: 5, x: 11, y: 6 }, { dot: 6, x: 11, y: 10 }, { dot: 8, x: 11, y: 14 },
] as const;
const FIRST_FRAME = [1, 2, 4];

/** Work in progress with no measurable end, for short waits. Prefer `Progress` when you know how far along it is. */
export function Spinner({ size = 16, label, className, variant = "ring" }: SpinnerProps) {
  const status = label ? ({ role: "status" as const, "aria-label": label }) : ({ "aria-hidden": true as const });
  if (variant === "braille") {
    return (
      <span {...status} data-variant="braille" className={join("basalt-spinner", className)} style={{ width: size, height: size }}>
        <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
          {DOTS.map(({ dot, x, y }) => (
            <circle key={dot} className="basalt-spinner-dot" data-dot={dot <= 6 ? dot : undefined} data-lit={FIRST_FRAME.includes(dot) ? "" : undefined} cx={x} cy={y} r={1.25} />
          ))}
        </svg>
      </span>
    );
  }
  return (
    <span {...status} data-variant="ring" className={join("basalt-spinner", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        <path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
