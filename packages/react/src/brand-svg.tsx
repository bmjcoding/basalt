import * as React from "react";

import { join } from "./utils";

// One way to inline a file from `brand/` (the wording audit's W1). Every brand SVG carries a `<title>` build note ("Blacksand · header lockup, 1x fit"), which a browser shows as a
// tooltip inside a link and an assistive technology can announce, and `brand/` is never edited to drop it. So a brand file reaches the page through this module, and only through it:
// the file's text goes in as `source`, its title is dropped when the text is read, and the drawing is `aria-hidden`, not focusable and takes no pointer. The link or the element
// round it carries the name (`SiteBrand`'s `label`, an `aria-label`). Nothing here runs when the module loads.

/** What a brand SVG is, read: the root's `viewBox` and size, and the markup inside the root with every `title` taken out. */
export interface BrandDrawing {
  viewBox: string;
  width: number;
  height: number;
  /** The drawing's own elements (paths, groups), as written in the file, without a `title`. */
  inner: string;
}

// A tag's attributes may hold `>` inside quotes, so the root tag is read quote by quote.
const ROOT = /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*)<\/svg>\s*$/i;
const TITLE = /<title\b[^>]*>[\s\S]*?<\/title\s*>|<title\b[^>]*\/>/gi;

const attribute = (attributes: string, name: string): string | undefined => {
  const found = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(attributes);
  return found ? (found[1] ?? found[2]) : undefined;
};

/**
 * Reads a brand SVG's text: its `viewBox`, its size and its drawing with the `title` removed. Throws when the text is not one SVG with a `viewBox`, so a wrong file is found when it is
 * first drawn and never drawn wrongly.
 */
export function readBrandSvg(source: string): BrandDrawing {
  const match = ROOT.exec(source);
  if (!match) throw new Error("a brand drawing is the text of one SVG file: <svg viewBox=…>…</svg>");
  const viewBox = attribute(match[1]!, "viewBox");
  if (!viewBox) throw new Error("a brand drawing needs a viewBox");
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  const width = Number(attribute(match[1]!, "width")) || parts[2] || 0;
  const height = Number(attribute(match[1]!, "height")) || parts[3] || 0;
  return { viewBox, width, height, inner: match[2]!.replace(TITLE, "") };
}

/**
 * A lockup's drawing, read from the text of a brand file (`lockup-header-1x.svg`): its `viewBox` and its one path, for `SiteHeader`'s and `SiteBrand`'s `lockup={{ x1, x2 }}`. The file's
 * `title` is not read, so the page never carries it. Throws for a file of several paths (a lockup is one outlined path): pass `{ viewBox, d }` for a drawing of several.
 */
export function lockupDrawing(source: string): { viewBox: string; d: string } {
  const { viewBox, inner } = readBrandSvg(source);
  const paths = [...inner.matchAll(/<path\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi)];
  const d = paths.length === 1 ? /(?:^|\s)d\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(paths[0]![1]!) : null;
  if (!d) throw new Error("a lockup file is one path: pass `{ viewBox, d }` for a drawing of several");
  return { viewBox, d: d[1] ?? d[2] ?? "" };
}

export interface BrandSvgProps extends Omit<React.ComponentProps<"svg">, "children" | "dangerouslySetInnerHTML" | "viewBox" | "aria-hidden" | "focusable"> {
  /** The text of a file from `brand/`, as it is (for example `import file from "../brand/blacksand/mark.svg?raw"`). Its title is not drawn. */
  source: string;
}

/**
 * A brand file drawn inline: `aria-hidden`, `focusable="false"`, no pointer (`pointer-events: none`) and no title element, so it has no tooltip and no name of its own. Put it inside a link
 * or a heading that carries the name: `SiteBrand`'s children, `AppShell`'s `brand`, or your own `<a aria-label="Blacksand home">`. The source is a file of the repository's `brand/`, never user
 * input: it is drawn as markup.
 */
export function BrandSvg({ source, className, ...props }: BrandSvgProps) {
  const drawing = React.useMemo(() => readBrandSvg(source), [source]);
  return (
    <svg
      {...props}
      aria-hidden="true"
      focusable="false"
      viewBox={drawing.viewBox}
      width={props.width ?? drawing.width}
      height={props.height ?? drawing.height}
      className={join("basalt-brand-svg", className)}
      dangerouslySetInnerHTML={{ __html: drawing.inner }}
    />
  );
}
