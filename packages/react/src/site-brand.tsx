import * as React from "react";

import { join } from "./utils";

// The brand link of a site's bar, its narrow menu and its footer (DECISIONS 146 C and F): the 32px lockup in a link home, a target of at least 44 by 44 with no wash,
// its ring the control ring at +2, radius 6. The lockup by pixel density is a prop: `lockup={{ x1, x2 }}` takes the two drawings `brand/` ships (the files fitted to
// whole pixels for a 1x and a 2x screen), each defined once as a `symbol` and drawn with `use`, so no file and no `id` repeats; the stylesheet shows the 1x drawing
// and swaps to the 2x drawing from `min-resolution: 2dppx`, as `brand/README.md` says. It draws in the text colour (`currentColor`), so it stays in forced colours.

/** One drawing from `brand/`: the `viewBox` of its `svg` and the `d` of its one outlined `path` (every brand drawing is a single path, filled with `currentColor`). */
export interface LockupDrawing {
  viewBox: string;
  d: string;
}

/** The two header drawings of a brand: `lockup-header-1x` and `lockup-header-2x`, which are not interchangeable. */
export interface SiteLockup {
  x1: LockupDrawing;
  x2: LockupDrawing;
}

interface Ids { x1: string; x2: string }
/** The symbols a landmark has already defined, so its brand links (the bar's, the menu's) draw them and define nothing. */
const SpriteContext = React.createContext<Ids | null>(null);

function ids(base: string): Ids {
  return { x1: `${base}-1x`, x2: `${base}-2x` };
}

function Symbols({ lockup, id }: { lockup: SiteLockup; id: Ids }) {
  return (
    <svg aria-hidden="true" focusable="false" className="basalt-lockup-sprite">
      <symbol id={id.x1} viewBox={lockup.x1.viewBox}><path fill="currentColor" d={lockup.x1.d} /></symbol>
      <symbol id={id.x2} viewBox={lockup.x2.viewBox}><path fill="currentColor" d={lockup.x2.d} /></symbol>
    </svg>
  );
}

/**
 * Defines a lockup's two symbols once and lets every `SiteBrand` inside draw them. `SiteHeader` does this for its own two brand links (the bar's and the narrow menu's), so a
 * site passes `lockup` to it once. `SiteFooter` takes no `lockup`: its `brand` is a node, and a `SiteBrand` there (given its own `lockup`) defines its own symbols. Use this
 * directly where a site's own bar draws two brand links.
 */
export function SiteLockupDefs({ lockup, children }: { lockup?: SiteLockup; children?: React.ReactNode }) {
  const base = `basalt-lockup-${React.useId().replaceAll(":", "")}`;
  const id = React.useMemo(() => ids(base), [base]);
  if (!lockup) return <>{children}</>;
  return (
    <SpriteContext.Provider value={id}>
      <Symbols lockup={lockup} id={id} />
      {children}
    </SpriteContext.Provider>
  );
}

function size(viewBox: string): { width: number; height: number } {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  return { width: parts[2] ?? 0, height: parts[3] ?? 0 };
}

function Lockup({ lockup, id }: { lockup: SiteLockup; id: Ids }) {
  return (
    <>
      {(["x1", "x2"] as const).map((x) => (
        <svg key={x} aria-hidden="true" focusable="false" viewBox={lockup[x].viewBox} {...size(lockup[x].viewBox)} className={`basalt-lockup basalt-lockup-${x === "x1" ? "1x" : "2x"}`}>
          <use href={`#${id[x]}`} />
        </svg>
      ))}
    </>
  );
}

export interface SiteBrandProps extends Omit<React.ComponentProps<"a">, "aria-label" | "children"> {
  /** The link's name, e.g. "Blacksand home". Required: the lockup is decorative. */
  label: string;
  /** Where the brand links. Default "/". */
  href?: string;
  /** The lockup by pixel density. Defined once per landmark and drawn with `use`; only the drawing fitted to the screen is rendered. */
  lockup?: SiteLockup;
  /** The 32px lockup as a node, or anything drawn after the lockup (an app's own mark). */
  children?: React.ReactNode;
}

/**
 * The brand link: the lockup in a link home, a target of at least 44 by 44, with no wash. The same part is the bar's brand, the narrow menu's first row and the
 * footer's. Mark art that sits on a stage's art is a `data-quiet` box like any ink (pass `data-quiet`); the headroom check grows it by `space-1-5`.
 */
export function SiteBrand({ label, href = "/", lockup, children, className, ...props }: SiteBrandProps) {
  const defined = React.useContext(SpriteContext);
  const base = `basalt-lockup-${React.useId().replaceAll(":", "")}`;
  const own = React.useMemo(() => ids(base), [base]);
  const id = defined ?? own;
  return (
    <>
      {lockup && !defined ? <Symbols lockup={lockup} id={own} /> : null}
      <a {...props} href={href} aria-label={label} className={join("basalt-site-brand", className)}>
        <span className="basalt-site-brand-mark">
          {lockup ? <Lockup lockup={lockup} id={id} /> : null}
          {children}
        </span>
      </a>
    </>
  );
}
