import * as React from "react";

import { useGlide } from "./motion";
import { join } from "./utils";

export interface NumberTickerProps {
  value: number;
  /** Shown to everyone, including screen readers. Defaults to a grouped number. */
  format?: (value: number) => string;
  /** Ease the visible digits toward `value`. The readable text is still the target, once. */
  glide?: boolean;
  className?: string;
}

const TICKER_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Grouped, with as many decimals as the target has. A glide in flight shows the same number
// of decimals, so the width does not jump while it eases.
function defaultFormat(value: number) {
  const decimals = new Intl.NumberFormat("en-US", { maximumFractionDigits: 20, useGrouping: false }).format(value).split(".")[1]?.length ?? 0;
  return (shown: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(shown);
}

/** Rolls each digit into place. Reduced motion snaps. The readable value is always in the text. */
export function NumberTicker({ value, format, glide = false, className }: NumberTickerProps) {
  if (glide) return <GlidingTicker value={value} format={format} className={className} />;
  return <TickerBody value={value} shown={value} format={format} className={className} />;
}

function GlidingTicker({ value, format, className }: Omit<NumberTickerProps, "glide">) {
  // The eased value goes to the formatter as it is: a custom format decides its own rounding.
  const eased = useGlide(value);
  return <TickerBody value={value} shown={eased} format={format} className={className} />;
}

function TickerBody({ value, shown, format, className }: NumberTickerProps & { shown: number }) {
  const show = format ?? defaultFormat(value);
  const text = show(shown);
  const spoken = show(value);
  return (
    <span className={join("basalt-ticker", className)}>
      <span className="basalt-visually-hidden">{spoken}</span>
      <span aria-hidden="true" className="basalt-ticker-visual">
        {Array.from(text).map((character, index) =>
          TICKER_DIGITS.includes(character) ? (
            <span key={`${index}-${text.length}`} className="basalt-ticker-digit" style={{ "--_d": TICKER_DIGITS.indexOf(character) } as React.CSSProperties}>
              <span className="basalt-ticker-strip">
                {TICKER_DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`${index}-mark`} className="basalt-ticker-char">
              {character}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
