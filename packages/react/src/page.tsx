import * as React from "react";

import { join } from "./utils";

// The page: the row, the sections, a section's head and the twelve-track grid (DECISIONS 137, approved in 139). Pages only: a component
// that lays out its own items answers its own width. Every size comes from the tokens in the stylesheet; nothing here sets a length.

/**
 * The lead: the paragraph under a display headline. 400 in secondary ink, `text-xl` (20/28) from 720 and `text-lg` (18/26) under it, at
 * `size-prose-width` on the row's start edge, `text-wrap: pretty`. An app's page that is not set at display size takes `Text size="lg"`.
 */
export function Lead({ className, ...props }: React.ComponentProps<"p">) {
  return <p {...props} className={join("basalt-lead", className)} />;
}

export interface PageRowProps extends React.ComponentProps<"div"> {
  /** The element: `div` by default; a page's footer, header or nav sits on the row too. */
  as?: "div" | "footer" | "header" | "nav";
}

/**
 * The page row: `size-page-width` with the gutter inside, the site header's row exactly, so a headline, a lead, a table and a chart start under
 * the brand. It is the row of a first screen too; art that wants more is full-bleed in a `Stage`, never a wider row.
 */
export function PageRow({ as = "div", className, ...props }: PageRowProps): React.JSX.Element {
  return React.createElement(as, { ...props, className: join("basalt-page-row", className) });
}

export interface PageSectionsProps extends React.ComponentProps<"main"> {
  /** `main` by default, the page's one; `div` where the page already has a `main`. */
  as?: "main" | "div";
}

/**
 * A page's sections, one section gap apart (128 from 1024, 96 from 720, 64 under it). The first starts half a gap below the bar and the page
 * ends a full gap above its footer. No section is given the window's height: the widest empty band on a page is one gap.
 */
export function PageSections({ as = "main", className, ...props }: PageSectionsProps): React.JSX.Element {
  return React.createElement(as, { ...props, className: join("basalt-page-sections", className) });
}

/** A section: a `section` on the row, a section gap below the one before it. Name it with `aria-labelledby` its headline's `id`. */
export function PageSection({ className, ...props }: React.ComponentProps<"section">) {
  return <section {...props} className={join("basalt-page-section", className)} />;
}

/** A section's head: the headline, the lead and the actions, then half a section gap to the section's body. */
export function SectionIntro({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-section-intro", className)} />;
}

/** The buttons under a lead: `space-8` below it (`space-6` under 720), `space-3` apart, wrapping. */
export function SectionActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-section-actions", className)} />;
}

/** A layout of the twelve tracks: `2`, `3` and `4` equal columns, or an uneven split (`7-5`, `5-7`, `8-4`, `4-8`) of a text column beside an object. */
export type ColumnsLayout = "2" | "3" | "4" | "7-5" | "5-7" | "8-4" | "4-8";

/** The sizes that set a heading as display type, whose longest words need a row or a span of seven columns or more. */
const DISPLAY_SIZES: readonly unknown[] = ["hero", "display", "6xl", "7xl"];

/** Whether `node` or any element in it, at most four levels down, is set at a display size. */
function holdsDisplay(node: React.ReactNode, depth = 0): boolean {
  if (depth > 3) return false;
  let found = false;
  React.Children.forEach(node, (child) => {
    if (found || !React.isValidElement(child)) return;
    const props = child.props as { size?: unknown; children?: React.ReactNode };
    found = DISPLAY_SIZES.includes(props.size) || holdsDisplay(props.children, depth + 1);
  });
  return found;
}

/** How many tracks a named layout gives its item at `index` (0 for the first) from 1024. */
function layoutTracks(layout: ColumnsLayout, index: number): number {
  const first = index % 2 === 0;
  switch (layout) {
    case "2": return 6;
    case "3": return 4;
    case "4": return 3;
    case "7-5": return first ? 7 : 5;
    case "5-7": return first ? 5 : 7;
    case "8-4": return first ? 8 : 4;
    default: return first ? 4 : 8;
  }
}

let warned: Set<string> | undefined;
declare const process: { env: { NODE_ENV?: string } };

/** Development only: said once for each layout (or own span) and track count. */
function warnNarrow(key: string, tracks: number) {
  warned ??= new Set();
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`Basalt ColumnsItem: a display heading in a span of ${tracks} of 12 columns breaks words; give it a span of 7 or more, or set it at 5xl or smaller.`);
}

export interface ColumnsProps extends React.ComponentProps<"div"> {
  /** The layout of the items by position. Without one each item takes the whole row, or its own `span` from 1024. */
  layout?: ColumnsLayout;
}

/**
 * Twelve tracks on the row, the gutter between them and `space-8` between rows. From 720 to 1023 `2` and `3` hold, `4` becomes two rows of two and
 * everything else stacks; under 720 every item takes the full row, in source order. A display headline never sits in a column narrower than 7 of 12:
 * in development a display or hero heading (or a fixed `6xl` or `7xl`) in an item of fewer than 7 tracks from 1024 that a named layout makes (every item
 * of `2`, `3` and `4`, the 5 of `7-5` and `5-7`, the 4 of `8-4` and `4-8`) logs a warning, and is drawn as written. An item with its own `span` is a
 * `ColumnsItem`'s to warn about.
 */
export function Columns({ layout, className, children, ...props }: ColumnsProps) {
  // Development only: a bundler that sets NODE_ENV to production (every one an app uses does) drops this whole condition and its block, strings included.
  if (process.env.NODE_ENV !== "production" && layout !== undefined) {
    let index = 0;
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const tracks = layoutTracks(layout, index++);
      if (tracks < 7 && (child.props as { span?: unknown }).span === undefined && holdsDisplay(child)) warnNarrow(`${layout}:${tracks}`, tracks);
    });
  }
  return <div {...props} data-layout={layout} className={join("basalt-columns", className)}>{children}</div>;
}

export interface ColumnsItemProps extends React.ComponentProps<"div"> {
  /**
   * How many of the twelve tracks the item spans (1 to 12), from 1024 only. From 720 to 1023 the layout's rule decides (`2` and `3` hold, `4` is two
   * rows of two, anything else, an unnamed layout included, is a full row), and under 720 the item takes the full row. In development a display or hero
   * heading in a span under 7 logs a warning; it is drawn as written.
   */
  span?: number;
}

/** An item of `Columns` with its own span, for what no layout names. */
export function ColumnsItem({ span, style, className, children, ...props }: ColumnsItemProps) {
  // Development only: a bundler that sets NODE_ENV to production (every one an app uses does) drops this whole condition and its block, string included.
  if (process.env.NODE_ENV !== "production" && span !== undefined && span < 7 && holdsDisplay(children)) warnNarrow(`span:${span}`, span);
  return <div {...props} className={className} style={span === undefined ? style : ({ "--span": Math.min(12, Math.max(1, Math.round(span))), ...style } as React.CSSProperties)}>{children}</div>;
}
