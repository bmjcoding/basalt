import * as React from "react";

import { useGlide } from "./motion";
import { formatNumber } from "./number-format";
import { join } from "./utils";

export interface NumberTickerProps {
  value: number;
  /** Shown to everyone, including screen readers. Defaults to a grouped number. */
  format?: (value: number) => string;
  /**
   * The locale the default format writes in (micro-details m2 I3). Default `"en-US"`, never the runtime's. Only the ASCII digits 0 to 9 roll; any other
   * digit, separator or sign is drawn still. A `format` given wins.
   */
  locale?: string | string[];
  /** Ease the visible digits toward `value` (over `slow`, on `ease-out`). The readable text is still the target, once. */
  glide?: boolean;
  className?: string;
}

const TICKER_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Grouped, in the locale, with as many decimals as the target has: the count is worked out locale-free, so a glide in flight shows the same number
// of decimals in any locale, and the width does not jump while it eases.
function defaultFormat(value: number, locale: string | string[]) {
  const decimals = formatNumber(value, { maximumFractionDigits: 20, useGrouping: false }).split(".")[1]?.length ?? 0;
  return (shown: number) => formatNumber(shown, { locale, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Rolls each digit into place. Under reduced motion it is plain tabular text. The readable value is always in the text. */
export function NumberTicker({ value, format, locale = "en-US", glide = false, className }: NumberTickerProps) {
  if (glide) return <GlidingTicker value={value} format={format} locale={locale} className={className} />;
  return <TickerBody value={value} shown={value} format={format} locale={locale} className={className} />;
}

function GlidingTicker({ value, format, locale, className }: Omit<NumberTickerProps, "glide">) {
  // The eased value goes to the formatter as it is: a custom format decides its own rounding.
  const eased = useGlide(value);
  return <TickerBody value={value} shown={eased} format={format} locale={locale} className={className} glide />;
}

// `glide`: the digits follow a value that is already easing, one frame at a time. The strip must not ease them again,
// or every frame restarts a second transition and the headline outlasts the axis it moves with.
function TickerBody({ value, shown, format, locale = "en-US", className, glide }: NumberTickerProps & { shown: number }) {
  const show = format ?? defaultFormat(value, locale);
  const text = show(shown);
  const spoken = show(value);
  return (
    <span className={join("basalt-ticker", className)} data-glide={glide ? "" : undefined}>
      {/* The real number, once, first in the flow of the sentence: transparent and selectable, in a box with no width that its text overflows, under the
          strips that follow. A selection paints the sentence's own band through it and copies the number once, on the sentence's line, by every route
          that reads a selection (Copy, drag, Services, assistive technology, `Selection.toString()`). Read aloud, and found. Under reduced motion the
          strips go and it is the visible text. */}
      <span className="basalt-ticker-text">{spoken}</span>
      {/* The digits are drawn, never selected: the strips are unselectable, and their characters are generated content, never text in the DOM. */}
      <span aria-hidden="true" className="basalt-ticker-visual">
        {Array.from(text).map((character, index) =>
          TICKER_DIGITS.includes(character) ? (
            <span key={`${index}-${text.length}`} className="basalt-ticker-digit" style={{ "--_d": TICKER_DIGITS.indexOf(character) } as React.CSSProperties}>
              {/* The strip's ten digits are drawn by the stylesheet (generated content), so no digit column is a text node. */}
              <span className="basalt-ticker-strip" />
            </span>
          ) : (
            <span key={`${index}-mark`} className="basalt-ticker-char" data-ch={character} />
          ),
        )}
      </span>
    </span>
  );
}
