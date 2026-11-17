import * as React from "react";

import { join } from "./utils";

// The app tile (DECISIONS 162, votes 5 and 6; N1's tile, ported): the picture an app gives, clipped to the icon shape, flat on the page with one
// solid hairline round it. A tile in the flow does not float, so it has no shadow. Nothing is drawn over the picture; none is recoloured, dimmed,
// cropped, turned or animated. It is decorative: the company's name is always beside it. Basalt ships no company's icon file: the product gives
// the file, and gives only one it has the right to show.

/** The sizes a tile is drawn at: 20 is the large icon size and 32 to 52 are the controls' (`size-control-md` to `-4xl`). */
export type AppTileSize = 20 | 32 | 36 | 40 | 44 | 48 | 52;

export interface AppTileProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The picture the product gives it. It is shown as it is, and never resized or filtered. */
  src: string;
  /**
   * The tile's side, from the seven sizes. Left out, the tile is as wide as the box it is in and square (`aspect-ratio: 1`), so the parent
   * sets the size; either way its box is reserved before the picture arrives and nothing moves when it does.
   */
  size?: AppTileSize;
  /** `lazy` by default. */
  loading?: "lazy" | "eager";
}

/** The icon shape, a superellipse: |x|^5 + |y|^5 = 1 in a unit box whose centre is `origin`, as 120 points. Built when first used, never at import. */
function squircle(origin: number): string {
  const points: string[] = [];
  const count = 120;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    points.push(`${(Math.sign(c) * Math.abs(c) ** (2 / 5) * 0.5 + origin).toFixed(4)} ${(Math.sign(s) * Math.abs(s) ** (2 / 5) * 0.5 + origin).toFixed(4)}`);
  }
  return `M${points.join("L")}Z`;
}

let shapes: { centred: string; boxed: string } | null = null;
const shape = () => (shapes ??= { centred: squircle(0), boxed: squircle(0.5) });

/**
 * One app's tile, decorative: the picture clipped to a superellipse of exponent 5 at every size (the shape takes no radius), with a 1px
 * hairline that follows it, drawn over the picture and half a pixel outside it, so the picture is not cut. The tile carries its own clip, so
 * no page-level definitions are needed and a tile can never be left unclipped. Not drawn in forced colours: the company's name beside it carries
 * the meaning. There is no fallback when the picture is missing or fails; the box and its rim stay.
 */
export function AppTile({ src, size, loading = "lazy", className, ...props }: AppTileProps) {
  const id = `basalt-tile-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <span {...props} aria-hidden="true" data-size={size} className={join("basalt-app-tile", className)}>
      <svg className="basalt-app-tile-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path d={shape().boxed} /></clipPath></defs>
      </svg>
      <img src={src} alt="" draggable={false} loading={loading} decoding="async" style={{ clipPath: `url(#${id})` }} />
      <svg className="basalt-app-tile-rim" viewBox="-0.5 -0.5 1 1" aria-hidden="true" focusable="false"><path d={shape().centred} /></svg>
    </span>
  );
}
