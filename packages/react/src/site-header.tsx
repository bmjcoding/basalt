import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { CloseGlyph } from "./glyphs/close";
import { MenuGlyph } from "./glyphs/menu";
import { useAtTop } from "./at-top";
import { LoopsToggleButton } from "./loops-toggle-button";
import { MorphIcon } from "./morph-icon";
import { Nav, NavItem } from "./nav";
import { GlidePlate } from "./plate";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./overlays";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";

// The site header: the one smoked bar of a marketing or docs site (decisions 96). The brand, the links beside it, a spacer,
// then the actions. Under 720 the links and the primary action leave the bar and a Menu button opens a top sheet that redraws
// the bar in its first row and unrolls the links beneath it. The layout lengths are tokens (size-header, size-page-width,
// size-gutter and the breakpoints; decision 101).
//
// Over a `Stage` that declares its headroom passed, and only at the very top of the page, the bar is clear (decision 104): no fill, no blur
// and a transparent line, on the art, with the theme's own ink. From the first pixel of scroll it is the smoked bar again. The component
// only reports where the page is (`data-top`); the stylesheet decides whether that means clear, so a page with no stage, an undeclared
// stage, no script, no `backdrop-filter`, reduced transparency, forced colours or print keeps the smoked bar.

/** One link in the bar and in the narrow menu. */
export interface SiteHeaderLink {
  href: string;
  /** The link's words. It is also its name, so keep it short; five links at most fit beside the brand at 720. */
  label: string;
  /** This link is the current page: `aria-current="page"`, primary ink at 600, no background. */
  current?: boolean;
}

export interface SiteHeaderProps extends Omit<React.ComponentProps<"header">, "children"> {
  /** The 32px header lockup the brand ships (`brand/`), or an app's own. It goes inside the link home, in a 44px target. */
  brand: React.ReactNode;
  /** The brand link's name, e.g. "Blacksand home". */
  brandLabel: string;
  /** Where the brand links. Default "/". */
  homeHref?: string;
  /**
   * The links, start-aligned beside the brand. They must fit at 720 beside the brand and the actions, so five at most; the
   * rest go in the footer. This is a rule for the site, not something the component measures.
   */
  links?: SiteHeaderLink[];
  /**
   * The hold on loops: `<LoopsToggleIcon />` (`LoopsToggle`'s icon form), shown only on a page that has an ambient loop or a loop that can run
   * past five seconds. It sits in the bar's end cluster, before the theme toggle, and stays in the bar at every width. Passing it once is
   * all an app does: when the narrow menu is open the bar is covered, so the menu's first row, below its band and before its links, is the same
   * control in its Button form ("Pause animations"), and the hold can be reached while the menu is open. Pass nothing on a page with no such
   * loop: the menu then has no such row.
   */
  loopsToggle?: React.ReactNode;
  /** The theme toggle: a ghost `IconButton`. It stays in the bar at every width and is drawn again in the narrow menu's first row, so give it no `id`. */
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
}

/** The bar is a plain `button` with the ghost icon button's look, because its glyph morphs (`IconButton` takes a glyph, not a morph). */
const barButton = { "data-variant": "ghost", "data-size": "md", "data-icon-only": "" } as const;

function Brand({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="basalt-site-brand">
      <span className="basalt-site-brand-mark">{children}</span>
    </a>
  );
}

/**
 * The site header. 56px at every width with its hairline inside, `basalt-chrome` (the one smoked surface; use it once per
 * viewport), the top safe area as padding above it. Links are `text-base` at 400 in secondary ink on a 32px hugging pill
 * inside a 44px target; hover is the pill at the selected wash with the ink to primary, one shared pill gliding as `Nav`'s
 * does; the current page is primary at 600 with no background. Under 720 it is brand, toggle and a Menu button.
 */
export function SiteHeader({ brand, brandLabel, homeHref = "/", links = [], loopsToggle, themeToggle, action, navLabel = "Primary", menuLabel = "Menu", closeLabel = "Close menu", solid = false, className, ...props }: SiteHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const wide = useMediaQuery(`(width >= ${breakpoint.md}px)`);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const close = React.useRef<HTMLButtonElement>(null);
  const bar = React.useRef<HTMLElement>(null);
  const { top, jump } = useAtTop(!solid);
  const wideNow = React.useRef(wide);
  wideNow.current = wide;
  // The link in the bar that focus goes back to when the menu closes because the window widened: the current one.
  const barLink = () => bar.current?.querySelector<HTMLElement>('.basalt-site-link[aria-current="page"]') ?? bar.current?.querySelector<HTMLElement>(".basalt-site-link") ?? null;

  // Widening past 720 closes the menu: its trigger is gone from the bar, and the links it held are back in it.
  React.useEffect(() => {
    if (wide && open) setOpen(false);
  }, [wide, open]);

  return (
    <header {...props} data-solid={solid ? "" : undefined} data-top={top ? "" : undefined} data-jump={jump ? "" : undefined} className={join("basalt-chrome basalt-site-header", className)}>
      <div className="basalt-site-bar">
        <Brand href={homeHref} label={brandLabel}>{brand}</Brand>
        {links.length ? (
          <nav ref={bar} aria-label={navLabel} className="basalt-site-links">
            <GlidePlate navigation />
            <ul className="basalt-site-links-list">
              {links.map((link) => (
                <li key={link.href + link.label}>
                  <a href={link.href} aria-current={link.current ? "page" : undefined} className="basalt-site-link">
                    <span className="basalt-site-pill">
                      <span className="basalt-site-label" data-label={link.label}>{link.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <span className="basalt-bar-spacer" />
        <div className="basalt-bar-actions">
          {loopsToggle}
          {themeToggle}
          {action ? <span className="basalt-site-action">{action}</span> : null}
          {links.length || action ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger ref={trigger} aria-label={menuLabel} {...barButton} className="basalt-button basalt-site-menu-trigger">
                <MorphIcon glyph={open ? CloseGlyph : MenuGlyph} />
              </SheetTrigger>
              <SheetContent
                side="top"
                className="basalt-site-menu"
                initialFocus={() => close.current ?? true}
                finalFocus={() => (wideNow.current ? barLink() ?? true : trigger.current ?? true)}
              >
                <SheetTitle className="basalt-visually-hidden">{menuLabel}</SheetTitle>
                <div className="basalt-site-menu-band">
                  <Brand href={homeHref} label={brandLabel}>{brand}</Brand>
                  <span className="basalt-bar-spacer" />
                  <div className="basalt-bar-actions">
                    {themeToggle}
                    <MenuClose ref={close} label={closeLabel} open={open} />
                  </div>
                </div>
                {loopsToggle ? <div className="basalt-site-menu-loops"><LoopsToggleButton /></div> : null}
                {links.length ? (
                  <Nav aria-label={navLabel} className="basalt-site-menu-nav" onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
                    {links.map((link) => <NavItem key={link.href + link.label} href={link.href} current={link.current}>{link.label}</NavItem>)}
                  </Nav>
                ) : null}
                {action ? <div className="basalt-site-menu-foot">{action}</div> : null}
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Close, on the Menu button's exact box. It is drawn as Menu on arrival and morphs to Close, and back as the menu leaves. */
function MenuClose({ ref, label, open }: { ref: React.Ref<HTMLButtonElement>; label: string; open: boolean }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { setShown(open); }, [open]);
  return (
    <SheetClose ref={ref} aria-label={label} {...barButton} className="basalt-button basalt-site-menu-close">
      <MorphIcon glyph={shown ? CloseGlyph : MenuGlyph} />
    </SheetClose>
  );
}
