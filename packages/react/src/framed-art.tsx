import * as React from "react";

import { fitArt } from "./art-fit";
import type { ArtAnchor, ArtFit } from "./art-fit";
import { join } from "./utils";

// Framed art: a figure in the flow (decision 104). A distinct object, so a panel's geometry: a real 1px rim outside the art, radius 12 on
// the page (the nested-radius rule inside a panel), no shadow. The aspect ratio is always set, so the frame reserves its box before the
// art loads. A photograph with one version goes here, shown as it is.

export type FramedArtAspect = "square" | "photo" | "screen" | "wide";

/** How soon the browser fetches a picture, against the page's other requests: the `fetchpriority` attribute (micro-details m8, X8). */
export type ImageFetchPriority = "high" | "low" | "auto";

interface FramedArtBase extends Omit<React.ComponentProps<"figure">, "children"> {
  /** The ratio of the frame, from the four tokens: `square` 1, `photo` 3:2, `screen` 16:10, `wide` 16:9. Default `photo`. */
  aspect?: FramedArtAspect;
  /** The caption: what the art shows, under it, in secondary ink. */
  caption?: React.ReactNode;
  /** The credit: a line of its own under the caption, in tertiary ink. */
  credit?: React.ReactNode;
  /** `lazy` by default. */
}

/** A picture: a file the frame loads. */
interface FramedPicture {
  src: string;
  /**
   * The art's words. Meaningful art has them, and shows them in the frame if the file fails. Pass `""` for decorative art, which shows
   * nothing when it fails.
   */
  alt: string;
  art?: never;
  fit?: never;
  anchor?: never;
  /** `lazy` by default. */
  loading?: "lazy" | "eager";
  /**
   * The picture's `fetchpriority`, on the `<img>`; none is written by default. For the one picture on a first screen, pass `loading="eager"` and
   * `fetchPriority="high"`.
   */
  fetchPriority?: ImageFetchPriority;
  srcSet?: string;
  sizes?: string;
}

/** Drawn art: an inline `svg` or `canvas` in the same frame, with the same rim, radius and reserved box. */
interface FramedDrawing {
  src?: never;
  /** The drawing: an inline `svg` or `canvas`, drawn with the art tokens so it swaps with the theme. Its lines do not scale (`vector-effect: non-scaling-stroke`). */
  art: React.ReactNode;
  /** The drawing's words. Leave it out, or pass `""`, for decorative art, which is hidden from assistive technology. */
  alt?: string;
  /** `slice` (the default) keeps the proportions and fills the box, cropped like `object-fit: cover`; `meet` shows all of it on `art-field`. */
  fit?: ArtFit;
  /** Where the crop holds, like `object-position`: `end floor` keeps the end and the floor in every box. Default `center center`. */
  anchor?: ArtAnchor;
  loading?: never;
  fetchPriority?: never;
  srcSet?: never;
  sizes?: never;
}

export type FramedArtProps = FramedArtBase & (FramedPicture | FramedDrawing);

type Phase = "idle" | "loading" | "loaded" | "failed";

/**
 * The frame shows `surface-placeholder` while the art loads and if it fails (no shimmer, spinner or blurred preview); once decoded the
 * art fades in over `duration-base` on `ease-out` (100ms, opacity only, under reduced motion). Without script the art simply shows.
 * The caption and the credit are a `figcaption` under the frame, never over the art.
 */
export function FramedArt({ src, alt = "", art, fit, anchor, aspect = "photo", caption, credit, loading = "lazy", fetchPriority, srcSet, sizes, className, ...props }: FramedArtProps) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const image = React.useRef<HTMLImageElement>(null);
  // Which source a decode belongs to. A decode that finishes after the source changed (or after unmount) must not set the phase.
  const generation = React.useRef(0);
  // What the document already knows: an image that finished before this ran shows at once and does not fade in.
  React.useLayoutEffect(() => {
    const element = image.current;
    if (!element) return undefined;
    setPhase(element.complete ? (element.naturalWidth > 0 ? "loaded" : "failed") : "loading");
    return () => { generation.current += 1; };
  }, [src, srcSet]);
  const decorative = alt === "";
  const loaded = () => {
    const element = image.current;
    const mine = generation.current;
    const done = () => { if (generation.current === mine) setPhase("loaded"); };
    // Decoded, then shown, so a fade never starts on a half-painted picture.
    if (element && typeof element.decode === "function") element.decode().then(done, done); else done();
  };
  const drawn = art !== undefined ? fitArt(art, fit, anchor, fit !== undefined || anchor !== undefined) : null;
  return (
    <figure {...props} data-aspect={aspect} className={join("basalt-framed", className)}>
      {drawn ? (
        <div className="basalt-framed-frame" data-phase="loaded" data-drawn="">
          <div className="basalt-framed-art" style={drawn.style} data-fit={fit ?? "slice"} aria-hidden={decorative ? true : undefined} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : alt}>{drawn.node}</div>
        </div>
      ) : (
      <div className="basalt-framed-frame" data-phase={phase}>
        <img ref={image} className="basalt-framed-img" src={src} srcSet={srcSet} sizes={sizes} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" onLoad={loaded} onError={() => setPhase("failed")} />
        {phase === "failed" && !decorative ? <span className="basalt-framed-alt">{alt}</span> : null}
      </div>
      )}
      {caption || credit ? (
        <figcaption className="basalt-framed-caption">
          {caption ? <span className="basalt-framed-text">{caption}</span> : null}
          {credit ? <span className="basalt-framed-credit">{credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
