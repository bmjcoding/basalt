import * as React from "react";

import { join } from "./utils";

// One way to inline a file from `brand/` (the wording audit's W1). Every brand SVG carries a `<title>` build note ("Blacksand · header lockup, 1x fit"), which a browser shows as a
// tooltip inside a link and an assistive technology can announce, and `brand/` is never edited to drop it. So a brand file reaches the page through this module, and only through it:
// the file's text goes in as `source`, its title is dropped when the text is read, and the drawing is `aria-hidden`, not focusable and takes no pointer. The link or the element
// round it carries the name (`SiteBrand`'s `label`, an `aria-label`). Nothing here runs when the module loads.

export { readBrandSvg, lockupDrawing } from "./brand-svg-read";
export type { BrandDrawing } from "./brand-svg-read";
import { readBrandSvg } from "./brand-svg-read";

export interface BrandSvgProps extends Omit<React.ComponentProps<"svg">, "children" | "dangerouslySetInnerHTML" | "viewBox" | "aria-hidden" | "focusable"> {
  /** The text of a file from `brand/`, as it is (for example `import file from "../brand/blacksand/mark.svg?raw"`). Its title is not drawn. */
  source: string;
  /**
   * `ink` (the default) draws the mark in the text colour. `brand` draws it in the palette's brand-mark colour (`--basalt-brand-mark`), and in the text
   * colour under no palette and in forced colours. Opt in only for a mark: a wordmark, an image or a fixed-colour file is never tinted.
   */
  tone?: "ink" | "brand";
}

/**
 * A brand file drawn inline: `aria-hidden`, `focusable="false"`, no pointer (`pointer-events: none`) and no title element, so it has no tooltip and no name of its own. Put it inside a link
 * or a heading that carries the name: `SiteBrand`'s children, `AppShell`'s `brand`, or your own `<a aria-label="Blacksand home">`. The source is a file of the repository's `brand/`, never user
 * input: it is drawn as markup.
 */
export function BrandSvg({ source, tone = "ink", className, ...props }: BrandSvgProps) {
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
      data-tone={tone === "brand" ? "brand" : undefined}
      // sink: `source`, a brand file from the app's own repository (never user input, as the prop says); its title and script are dropped by readBrandSvg; test/words-fix-c12.test.mjs
      // oxlint-disable-next-line react/no-danger -- the brand file's inner markup, from the app's own repository (the sink: comment above)
      dangerouslySetInnerHTML={{ __html: drawing.inner }}
    />
  );
}
