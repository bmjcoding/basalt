import * as React from "react";

import { join } from "./utils";

// The stage: full-bleed art at the top of a page, under the site header (decision 104). Level 0, so it is the page painted with art:
// no rim, radius, shadow, line or fade is added where it ends. It starts at y = 0 under the bar (pulled up by the bar's height plus the
// top safe area) and its content starts below the headroom. One per page, at the top.

export interface StageProps extends Omit<React.ComponentProps<"section">, "children"> {
  /**
   * The art, behind the content: `PairedArt`, or art drawn with the art tokens (`var(--basalt-art-tone-2)`, inline SVG or canvas),
   * which swaps with the theme by itself. It is decorative: hidden from assistive technology, not drawn in forced colours and not
   * printed. Never dimmed, inverted, tinted, filtered or blended. A one-version photograph is not a stage; put it in `FramedArt`.
   */
  art: React.ReactNode;
  /**
   * Declares that the product's headroom check passed: the top `size-stage-headroom` (80px) plus the top safe area, across the full
   * width, holds no pixel past `art-quiet-limit`, in each theme, at the widths the art composes for (`checkHeadroom`, from
   * `@srasyndicate/basalt/testing`, is the test). `SiteHeader` clears only over a stage that declares it. Nothing is sampled at run
   * time, so the declaration is as good as the test behind it.
   */
  headroom?: boolean;
  /** The words and panels on the art. They start below the headroom. Ink goes only in a quiet zone (`data-quiet`); a panel is solid, at level 1, with its rim. */
  children?: React.ReactNode;
}

/**
 * The stage. It must follow the `SiteHeader` directly, as the page's first content: the pull-up under the bar is the bar's height.
 * Its height is its content's (the hero's), and while the art loads it shows `art-field`, the page colour, which meets the headroom
 * by definition.
 */
export function Stage({ art, headroom = false, className, children, ...props }: StageProps) {
  return (
    <section {...props} data-headroom={headroom ? "" : undefined} className={join("basalt-stage", className)}>
      <span className="basalt-stage-headroom" data-basalt-headroom="" aria-hidden="true" />
      <div className="basalt-stage-content">{children}</div>
      {/* After the content, so on a slow link the words arrive before the art and the stage is not painted short and then grown; it is
          absolutely placed and behind the content by z-index, so paint order and focus order are what they were. */}
      <div className="basalt-stage-art" aria-hidden="true">{art}</div>
    </section>
  );
}

export interface PairedArtProps {
  /** The picture for the dark theme. */
  dark: string;
  /** The picture for the light theme. */
  light: string;
  /** Where the picture sits in the stage when it is cropped, as CSS `object-position`. Default centre. */
  position?: string;
  /** Both pictures are `lazy` by default: only the one that is shown is in view, so only it loads until the theme changes. `eager` loads both. */
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
}

/**
 * A stage's art in two versions, a dark and a light, and the page's theme chooses: the one for `[data-theme]` or `.dark` or `.light`
 * (the toggle's), else the system's. Never filtered; the two files are the art. Decorative (`alt` is empty), as a stage's art is.
 */
export function PairedArt({ dark, light, position, loading = "lazy", width, height }: PairedArtProps) {
  const style = position ? { objectPosition: position } : undefined;
  return (
    <>
      <img className="basalt-paired-art" data-art="dark" src={dark} alt="" loading={loading} decoding="async" width={width} height={height} style={style} />
      <img className="basalt-paired-art" data-art="light" src={light} alt="" loading={loading} decoding="async" width={width} height={height} style={style} />
    </>
  );
}
