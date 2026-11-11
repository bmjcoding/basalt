import * as React from "react";

import { join } from "./utils";

// Framed art: a figure in the flow (decision 104). A distinct object, so a panel's geometry: a real 1px rim outside the art, radius 12 on
// the page (the nested-radius rule inside a panel), no shadow. The aspect ratio is always set, so the frame reserves its box before the
// art loads. A photograph with one version goes here, shown as it is.

export type FramedArtAspect = "square" | "photo" | "screen" | "wide";

export interface FramedArtProps extends Omit<React.ComponentProps<"figure">, "children"> {
  src: string;
  /**
   * The art's words. Meaningful art has them, and shows them in the frame if the file fails. Pass `""` for decorative art, which shows
   * nothing when it fails.
   */
  alt: string;
  /** The ratio of the frame, from the four tokens: `square` 1, `photo` 3:2, `screen` 16:10, `wide` 16:9. Default `photo`. */
  aspect?: FramedArtAspect;
  /** The caption: what the art shows, under it, in secondary ink. */
  caption?: React.ReactNode;
  /** The credit: a line of its own under the caption, in tertiary ink. */
  credit?: React.ReactNode;
  /** `lazy` by default. */
  loading?: "lazy" | "eager";
  srcSet?: string;
  sizes?: string;
}

type Phase = "idle" | "loading" | "loaded" | "failed";

/**
 * The frame shows `surface-placeholder` while the art loads and if it fails (no shimmer, spinner or blurred preview); once decoded the
 * art fades in over `duration-base` on `ease-out` (100ms, opacity only, under reduced motion). Without script the art simply shows.
 * The caption and the credit are a `figcaption` under the frame, never over the art.
 */
export function FramedArt({ src, alt, aspect = "photo", caption, credit, loading = "lazy", srcSet, sizes, className, ...props }: FramedArtProps) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const image = React.useRef<HTMLImageElement>(null);
  // What the document already knows: an image that finished before this ran shows at once and does not fade in.
  React.useLayoutEffect(() => {
    const element = image.current;
    if (!element) return undefined;
    setPhase(element.complete ? (element.naturalWidth > 0 ? "loaded" : "failed") : "loading");
    return undefined;
  }, [src, srcSet]);
  const decorative = alt === "";
  const loaded = () => {
    const element = image.current;
    const done = () => setPhase("loaded");
    // Decoded, then shown, so a fade never starts on a half-painted picture.
    if (element && typeof element.decode === "function") element.decode().then(done, done); else done();
  };
  return (
    <figure {...props} data-aspect={aspect} className={join("basalt-framed", className)}>
      <div className="basalt-framed-frame" data-phase={phase}>
        <img ref={image} className="basalt-framed-img" src={src} srcSet={srcSet} sizes={sizes} alt={alt} loading={loading} decoding="async" onLoad={loaded} onError={() => setPhase("failed")} />
        {phase === "failed" && !decorative ? <span className="basalt-framed-alt">{alt}</span> : null}
      </div>
      {caption || credit ? (
        <figcaption className="basalt-framed-caption">
          {caption ? <span className="basalt-framed-text">{caption}</span> : null}
          {credit ? <span className="basalt-framed-credit">{credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
