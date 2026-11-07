import * as React from "react";

import { join } from "./utils";

export type SpinnerVariant = "ring" | "dots" | "braille" | "grid";

export interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** What is loading, announced to screen readers. Omit when a visible label beside it already says so. */
  label?: string;
  className?: string;
  /** `ring` is the arc, `dots` is three marks, `grid` is a 2×3 field, `braille` is the stepped mono frame. */
  variant?: SpinnerVariant;
}

/** Work in progress with no measurable end, for short waits. Prefer `Progress` when you know how far along it is. */
export function Spinner({ size = 16, label, className, variant = "ring" }: SpinnerProps) {
  const status = label ? ({ role: "status" as const, "aria-label": label }) : ({ "aria-hidden": true as const });
  if (variant === "braille") {
    return <span {...status} data-variant="braille" className={join("basalt-spinner", className)} style={{ fontSize: size }} />;
  }
  if (variant === "grid") {
    return (
      <span {...status} data-variant="grid" className={join("basalt-spinner", className)}>
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} aria-hidden="true" />
        ))}
      </span>
    );
  }
  if (variant === "dots") {
    return (
      <span {...status} data-variant="dots" className={join("basalt-spinner", className)} style={{ height: size }}>
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
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
