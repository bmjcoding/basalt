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
