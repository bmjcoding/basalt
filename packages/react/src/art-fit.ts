import * as React from "react";

// How drawn art sits in its box (DECISIONS 146 F): it keeps its proportions and fills the box (`slice`, cropped like `object-fit: cover`) or shows whole on the page colour
// (`meet`, letterboxed on `art-field`), held at an anchor like `object-position`. An inline `svg` takes this as its own `preserveAspectRatio`; a canvas, picture or image as
// `object-fit` and `object-position`, written as two custom properties the stylesheet reads. A drawing that must recompose for its box, not crop, is the site's own.

/** `slice` (the default) keeps the proportions and fills the box, cropping what overflows; `meet` shows all of it, with the page colour (`art-field`) at the sides. */
export type ArtFit = "slice" | "meet";

/** Where the crop holds, as `object-position` does: the inline side (`start`, `center`, `end`) then the block side (`top`, `center`, `floor`). `end floor` is `xMaxYMax`. */
export type ArtAnchor = `${"start" | "center" | "end"} ${"top" | "center" | "floor"}`;

const X = { start: "xMin", center: "xMid", end: "xMax" } as const;
const Y = { top: "YMin", center: "YMid", floor: "YMax" } as const;
const AT_X = { start: "0%", center: "50%", end: "100%" } as const;
const AT_Y = { top: "0%", center: "50%", floor: "100%" } as const;

export interface FittedArt {
  node: React.ReactNode;
  style: React.CSSProperties;
}

/**
 * The art with its fit and anchor applied. `slice` is the default (DECISIONS 146 F), for `FramedArt` and `Stage` alike. A drawing that sets its own `preserveAspectRatio`
 * and is given neither a fit nor an anchor keeps it: a prop overrides a drawing, a default does not.
 */
export function fitArt(art: React.ReactNode, fit: ArtFit = "slice", anchor: ArtAnchor = "center center", asked = true): FittedArt {
  const [x, y] = anchor.split(" ") as [keyof typeof X, keyof typeof Y];
  const aspect = `${X[x] ?? "xMid"}${Y[y] ?? "YMid"} ${fit}`;
  const own = React.isValidElement<{ preserveAspectRatio?: string }>(art) && art.type === "svg" && art.props.preserveAspectRatio !== undefined;
  const node = React.isValidElement(art) && art.type === "svg" && (asked || !own) ? React.cloneElement(art as React.ReactElement<{ preserveAspectRatio?: string }>, { preserveAspectRatio: aspect }) : art;
  const style = { "--_art-fit": fit === "slice" ? "cover" : "contain", "--_art-position": `${AT_X[x] ?? "50%"} ${AT_Y[y] ?? "50%"}` } as React.CSSProperties;
  return { node, style };
}
