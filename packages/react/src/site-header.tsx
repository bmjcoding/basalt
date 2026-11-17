import * as React from "react";

import { useAtTop } from "./at-top";
import { SiteBrand, SiteLockupDefs } from "./site-brand";
import type { SiteLockup } from "./site-brand";
import { SiteMenu } from "./site-menu";
import { SiteNav } from "./site-nav";
import type { SiteHeaderLink } from "./site-nav";
import { useSitePhase } from "./use-site-phase";
import type { SitePhaseOptions } from "./use-site-phase";
import { join } from "./utils";

// The site header: the one smoked bar of a marketing or docs site (decisions 96). The brand, the links beside it, a spacer, then the end cluster: `LoopsToggle`, up to two
// tools, and at most one primary action. Under 720 the links and the primary action leave the bar and a Menu button opens a top sheet that redraws the bar in its first row and
// unrolls the links beneath it. The layout lengths are tokens (size-header, size-page-width, size-gutter and the breakpoints; decision 101).
//
// It is built from parts a site's own bar uses too (DECISIONS 146 C): `SiteBrand`, `SiteNav`, `SiteMenu` and `useSitePhase`, with `basalt-chrome` for the smoke. A site's own
// bar keeps the behaviour (the glide, the 44px hit area, the current page, the first key, the narrow menu's focus) and draws its own shape. `SiteHeader` itself never centres.
//
// Over a `Stage` that declares its headroom passed, and only at the very top of the page, the bar is clear (decision 104): no fill, no blur
// and a transparent line, on the art, with the theme's own ink. From the first pixel of scroll it is the smoked bar again. The component
// only reports where the page is (`data-top`); the stylesheet decides whether that means clear, so a page with no stage, an undeclared
// stage, no script, no `backdrop-filter`, reduced transparency, forced colours or print keeps the smoked bar.

export type { SiteHeaderLink };

export interface SiteHeaderProps extends Omit<React.ComponentProps<"header">, "children"> {
  /** The 32px header lockup the brand ships (`brand/`) as a node, or an app's own. It goes inside the link home, in a 44px target. Leave it out when `lockup` draws it. */
  brand?: React.ReactNode;
  /** The lockup by pixel density, `{ x1, x2 }`: the two header drawings `brand/` ships, each defined once and drawn with `use` (DECISIONS 146 F). */
  lockup?: SiteLockup;
  /** The brand link's name, e.g. "Blacksand home". */
  brandLabel: string;
  /** Where the brand links. Default "/". */
  homeHref?: string;
  /**
   * The links, start-aligned beside the brand. They must fit at 720 beside the brand and the actions, five at most; the rest go in the footer. This is a rule for the site,
   * not something the component measures.
   */
  links?: SiteHeaderLink[];
  /**
   * The hold on loops: `<LoopsToggleIcon />` (`LoopsToggle`'s icon form), shown only on a page that has an ambient loop or a loop that can run
   * past five seconds. It is first in the bar's end cluster, before any tools and the primary Button, and stays in the bar at every width. Passing it once is
   * all an app does: when the narrow menu is open the bar is covered, so the menu's first row, below its band and before its links, is the same
   * control in its Button form ("Pause animations"), and the hold can be reached while the menu is open. Pass nothing on a page with no such
   * loop: the menu then has no such row.
   */
  loopsToggle?: React.ReactNode;
  /**
   * Up to two ghost icon controls that stay in the bar at every width (a search trigger, a basket), after `LoopsToggle` and before the action. The narrow menu draws them
   * again in its first row, so give them no `id`. A count beside a tool is not decided yet.
   */
  tools?: React.ReactNode;
  /** @deprecated The theme choice is in the site footer (`SiteFooter`), not the bar; the header has no theme control. Kept for one release, then removed. */
  themeToggle?: React.ReactNode;
  /** At most one primary `Button`. It leaves the bar under 720 and sits at the foot of the narrow menu, full width. Never a danger Button. */
  action?: React.ReactNode;
  /** The landmark's name. Default "Primary". */
  navLabel?: string;
  /** The narrow menu's trigger and dialog name. Default "Menu". */
  menuLabel?: string;
  /** The close button's name in the narrow menu. Default "Close menu". */
  closeLabel?: string;
  /** The opaque form: the same bar on `surface-page`, with no blur. For a site whose content does not scroll under the bar. It is never clear. */
  solid?: boolean;
  /**
   * A bar that arrives, or leaves and returns (`useSitePhase`): the header sits in a slot that keeps the row's height, and is fixed and dropped in once `after` has left
   * (the first screen, the hero, the hero's mark). Pass `{}` for a bar that comes as soon as the row starts to leave. A site's CSS restyles it by `data-form="row" | "bar"`.
   */
  phase?: SitePhaseOptions;
}

/** Sets every ref it is given: the header's own (for the phase hook) and the caller's. */
function merge<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

/**
 * The site header. 56px at every width with its hairline inside, `basalt-chrome` (the one smoked surface; use it once per
 * viewport), the top safe area as padding above it. Links are `text-base` at 400 in secondary ink on a 32px hugging pill
 * inside a 44px target; hover is the pill at the selected wash with the ink to primary, one shared pill gliding as `Nav`'s
 * does; the current page is primary at 600 with no background. Under 720 it is brand, `LoopsToggle`, the tools and a Menu button.
 */
export function SiteHeader({ brand, lockup, brandLabel, homeHref = "/", links = [], loopsToggle, tools, themeToggle, action, navLabel = "Primary", menuLabel = "Menu", closeLabel = "Close menu", solid = false, phase, className, ...props }: SiteHeaderProps) {
  const bar = React.useRef<HTMLElement>(null);
  const setRef = React.useMemo(() => merge<HTMLElement>(bar, props.ref), [props.ref]);
  const { top, jump } = useAtTop(!solid);
  const header = (
    <header {...props} ref={setRef} data-solid={solid ? "" : undefined} data-top={top ? "" : undefined} data-jump={jump ? "" : undefined} className={join("basalt-chrome basalt-site-header", className)}>
      <SiteLockupDefs lockup={lockup}>
        <div className="basalt-site-bar">
          <SiteBrand href={homeHref} label={brandLabel} lockup={lockup}>{brand}</SiteBrand>
          {links.length ? <SiteNav aria-label={navLabel} links={links} /> : null}
          <span className="basalt-bar-spacer" />
          <div className="basalt-bar-actions">
            {loopsToggle}
            {themeToggle}
            {tools}
            {action ? <span className="basalt-site-action">{action}</span> : null}
            {links.length || action ? (
              <SiteMenu
                brand={<SiteBrand href={homeHref} label={brandLabel} lockup={lockup}>{brand}</SiteBrand>}
                links={links}
                tools={tools}
                themeToggle={themeToggle}
                loops={Boolean(loopsToggle)}
                action={action}
                navLabel={navLabel}
                menuLabel={menuLabel}
                closeLabel={closeLabel}
              />
            ) : null}
          </div>
        </div>
      </SiteLockupDefs>
    </header>
  );
  return phase ? <PhaseSlot bar={bar} phase={phase}>{header}</PhaseSlot> : header;
}

/** The slot of a bar that arrives: in the flow, the resting row's height in every phase, so nothing below it ever moves. The header is its one child. */
function PhaseSlot({ bar, phase, children }: { bar: React.RefObject<HTMLElement | null>; phase: SitePhaseOptions; children: React.ReactNode }) {
  useSitePhase(bar, phase);
  return <div className="basalt-site-slot">{children}</div>;
}

export interface SitePhaseSlotProps extends React.ComponentProps<"div"> {}

/**
 * The slot for a site's own bar that arrives, or leaves and returns: a positioned `div` the height of the resting row (`--basalt-site-row`, the sticky offset by default),
 * in the flow. Its one child is the header, which `useSitePhase` drives. `SiteHeader` with `phase` draws its own.
 */
export function SitePhaseSlot({ className, ...props }: SitePhaseSlotProps) {
  return <div {...props} className={join("basalt-site-slot", className)} />;
}
