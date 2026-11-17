import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { CloseGlyph } from "./glyphs/close";
import { MenuGlyph } from "./glyphs/menu";
import { LoopsToggleButton } from "./loops-toggle-button";
import { MorphIcon } from "./morph-icon";
import { Nav, NavItem } from "./nav";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./overlays";
import type { SiteHeaderLink } from "./site-nav";
import { useMediaQuery } from "./use-media";

// The narrow menu, as a part (DECISIONS 146 C): the Menu button and the top sheet it opens, so a site that draws its own bar keeps the behaviour and never rebuilds
// it. Under 720 the links and the primary action leave the bar and the trigger, an icon, is shown; the sheet redraws the bar in its first row (the brand, the tools
// when the bar has them, and Close on the trigger's exact box), then `LoopsToggle`'s Button form when the page has a loops toggle (DECISIONS 143 and 148), then
// the links, then the action at the foot. Focus lands on Close; Escape, the scrim, Close or a link closes it and focus goes back to the trigger; widening past 720
// closes it and focuses the current link in the bar.

/** The bar's buttons are a plain `button` with the ghost icon button's look, because their glyph morphs (`IconButton` takes a glyph, not a morph). */
const barButton = { "data-variant": "ghost", "data-size": "md", "data-icon-only": "" } as const;

export interface SiteMenuProps {
  /** The brand, drawn again in the sheet's first row: a `SiteBrand`. */
  brand: React.ReactNode;
  /** The links the bar shows at 720 and over. They are the sheet's rows. */
  links?: SiteHeaderLink[];
  /** The bar's tools (up to two ghost icon controls that stay at every width), drawn again in the sheet's first row. Give them no `id`. */
  tools?: React.ReactNode;
  /** The deprecated theme toggle, drawn again in the sheet's first row. */
  themeToggle?: React.ReactNode;
  /** The page has a loops toggle in the bar: the sheet's first row after the band is `LoopsToggle`'s Button form, "Pause animations". */
  loops?: boolean;
  /** At most one primary `Button`, at the foot of the sheet, full width. */
  action?: React.ReactNode;
  /** The links' landmark name, in the sheet. Default "Primary". */
  navLabel?: string;
  /** The trigger's and the dialog's name. Default "Menu". */
  menuLabel?: string;
  /** The close button's name. Default "Close menu". */
  closeLabel?: string;
}

/**
 * The narrow menu's trigger and its top sheet. Place it last in the bar's end cluster. The trigger is the icon only (`display: none` from 720); it has the bar's
 * 44px box at every pointer.
 */
export function SiteMenu({ brand, links = [], tools, themeToggle, loops = false, action, navLabel = "Primary", menuLabel = "Menu", closeLabel = "Close menu" }: SiteMenuProps) {
  const [open, setOpen] = React.useState(false);
  const wide = useMediaQuery(`(width >= ${breakpoint.md}px)`);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const close = React.useRef<HTMLButtonElement>(null);
  const wideNow = React.useRef(wide);
  wideNow.current = wide;
  // The link in the bar that focus goes back to when the menu closes because the window widened: the current one.
  const barLink = () => {
    const bar = trigger.current?.closest("header");
    return bar?.querySelector<HTMLElement>('.basalt-site-link[aria-current="page"]') ?? bar?.querySelector<HTMLElement>(".basalt-site-link") ?? null;
  };
  // Widening past 720 closes the menu: its trigger is gone from the bar, and the links it held are back in it.
  React.useEffect(() => {
    if (wide && open) setOpen(false);
  }, [wide, open]);
  return (
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
          {brand}
          <span className="basalt-bar-spacer" />
          <div className="basalt-bar-actions">
            {tools}
            {themeToggle}
            <MenuClose ref={close} label={closeLabel} open={open} />
          </div>
        </div>
        {loops ? <div className="basalt-site-menu-loops"><LoopsToggleButton /></div> : null}
        {links.length ? (
          <Nav aria-label={navLabel} className="basalt-site-menu-nav" onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
            {links.map((link) => <NavItem key={link.href + link.label} href={link.href} current={link.current}>{link.label}</NavItem>)}
          </Nav>
        ) : null}
        {action ? <div className="basalt-site-menu-foot">{action}</div> : null}
      </SheetContent>
    </Sheet>
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
