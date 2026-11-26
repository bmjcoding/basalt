import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { AppTitleContext, isDisplayed } from "./app-title";
import type { AppTitleContextValue } from "./app-title";
import { TooltipProvider } from "./display";
import { DotLine } from "./dot-sep";
import { useMergedRef } from "./merged-ref";
import { NavRailContext } from "./nav";
import { usePinnedEdges } from "./pinned-edges";
import { useScreenKeyboardLayout } from "./screen-keyboard";
import type { TooltipProps } from "./display";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";
import { FootnoteContext, RailTooltipContext, VersionContext, VersionPlaceContext } from "./version-place";

declare const process: { env: { NODE_ENV?: string } };

// The app shell (decisions 96): a sidebar at 1024 and up, the rail from 720 to 1023, the phone tab bar under 720, and one
// header over the content column. The document is the scroller, never an inner pane (a page's own pane beside it is
// `PaneLayout`, sticky, like the sidebar). The layout lengths are tokens (size-sidebar-width, size-rail-width, size-header,
// size-tab-bar and the breakpoints; decision 101). The capped form is --basalt-shell-width wide at most, centred: by default
// size-sidebar-width plus size-page-width, so at the cap the column is exactly the page's own cap.

// The rail's tooltip for the version, on demand: only a shell in the rail with a version loads it (rail-tooltip.tsx). Until it is there the number
// stands alone, with its whole line in its name. A lazy component is made on first use, so loading this module does nothing.
let railTooltip: React.ComponentType<TooltipProps> | undefined;
function LazyRailTooltip(props: TooltipProps) {
  railTooltip ??= React.lazy(() => import("./rail-tooltip").then((module) => ({ default: module.RailTooltip })));
  const Tip = railTooltip;
  return <React.Suspense fallback={props.children}><Tip {...props} /></React.Suspense>;
}

export interface AppShellProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The brand in the sidebar's 56px band: the lockup (mark and word). It links home and draws no line of its own. A brand file goes in as `<BrandSvg source={file} />`, which hides it and drops its title; the link's name is `brandLabel`. */
  brand: React.ReactNode;
  /** The brand link's name, e.g. "Workbench home". */
  brandLabel: string;
  /** Where the brand links. Default "/". */
  homeHref?: string;
  /** The mark alone, shown in the rail in place of `brand`. Default: `brand`. */
  brandMark?: React.ReactNode;
  /**
   * The app's navigation: a `Nav` with its `NavGroup`s. Inside the shell it is the sidebar from 1024 and the rail from 720
   * to 1023 (the `Nav` follows the width; no `collapsed` prop needed), and it is not shown under 720.
   */
  sidebar: React.ReactNode;
  /** Account items pinned to the sidebar's foot: a second `Nav` (named "Account", say) holding Settings, Profile and the like. */
  account?: React.ReactNode;
  /**
   * The version this session runs, as a `VersionLink` to the release notes at that version. Drawn at the sidebar's foot under the account
   * items, as the number alone in the rail (the date in its name and tooltip), and as the last row of `TabBarMore`'s sheet under 720.
   */
  version?: React.ReactNode;
  /** The `AppHeader`: it spans the content column only, never the sidebar. */
  header: React.ReactNode;
  /** The phone `TabBar`, for an app with three or more destinations. Content pads past it, and toasts sit above it. */
  tabBar?: React.ReactNode;
  /**
   * A band stuck under the header that says the app's connection is not up: a `ConnectionBar`. It is a direct child of the content column, after the
   * header and before `main` (a sticky part sticks only inside its parent), so a phone page head (in `main`) is below it.
   */
  banner?: React.ReactNode;
  /**
   * The rail at every width from 720 (72px, `size-rail-width`), never the sidebar: `Nav` collapsed (48px circles, the label as name and tooltip, counts
   * spoken), the brand's mark alone, the version as its number, as the 720 to 1023 rail draws them. Under 720 the tab bar, as without it. With `capped`
   * the default cap is `size-rail-width` plus `size-page-width`; an app's own `--basalt-shell-width` still wins. Default false.
   */
  rail?: boolean;
  /**
   * A shared note at the sidebar's foot: an `AppFootnote`. Under the account items and above `version`; in the rail its `railTrigger` alone, above the
   * version; under 720 a row of `TabBarMore`'s sheet, above the version row.
   */
  footnote?: React.ReactNode;
  /**
   * A foot pinned to the bottom of the content column: a message field, an action bar. It holds still: on a short page it rests at the
   * window's bottom (the column is at least the window's height and the page takes the room between), and on a long page it sticks there
   * while the page scrolls under it. Under 720 it sits on the tab bar, and while an on-screen keyboard is up, on the keyboard. A solid band
   * on `surface-page` with a divider on top; at most the window less what is pinned at the top and one 44px row, then it scrolls. With a foot
   * the shell measures what is pinned (`usePinnedEdges`), so focus, anchors and the toast stack stay clear of it.
   */
  foot?: React.ReactNode;
  /** Props for the `main` element, e.g. an `id` for a skip link. */
  mainProps?: Omit<React.ComponentProps<"main">, "children">;
  /**
   * The capped form: the whole shell, sidebar and page, at most `--basalt-shell-width` wide and centred in the window, so on a wide
   * display the navigation and the page stay together and the space is shared by both sides. The width is `size-sidebar-width` plus
   * `size-page-width` (1408px at 16px text), so at the cap the page is exactly its own 72rem cap and below it nothing differs from
   * the uncapped shell; an app sets `--basalt-shell-width` on the root for another cap, and the page then fills its column. It
   * changes nothing under 1024, where the window is narrower than any cap.
   */
  capped?: boolean;
  /** The page. */
  children?: React.ReactNode;
}

/**
 * The shell of an app: a sidebar (256px, `surface-page`, edged by a 1px divider, sticky at `100dvh`, scrolling its own list
 * only when it overflows), the rail from 720 to 1023 (72px), and under 720 the tab bar instead. The header sits over the
 * content column and sticks to the document, which is what scrolls: set `scrollbar-gutter: stable` on the page (the shell
 * does for the document it is in), and give the viewport meta `viewport-fit=cover` so the safe-area insets work.
 */
export function AppShell({ brand, brandLabel, homeHref = "/", brandMark, sidebar, account, version, header, tabBar, banner, rail: railAlways = false, footnote, foot, mainProps, capped = false, className, children, ...props }: AppShellProps) {
  const narrow = useMediaQuery(`(width < ${breakpoint.lg}px)`);
  const rail = railAlways || narrow;
  useScreenKeyboardLayout();
  usePinnedEdges(foot != null);
  // The page's phone-only heading, registered by an `AppPageHead phoneOnly` in `main` and read by an `AppHeader phoneTitle="page"` (app-title.ts).
  const [heading, setHeading] = React.useState<HTMLElement | null>(null);
  const title = React.useMemo<AppTitleContextValue>(() => ({ heading, setHeading }), [heading]);
  // What More's sheet draws after its rows: the footnote, then the version (DECISIONS 320, 1.2).
  const more = footnote != null ? <FootnoteContext.Provider value={footnote}>{tabBar}</FootnoteContext.Provider> : tabBar;
  return (
    <AppTitleContext.Provider value={title}>
    <div {...props} data-tabbar={tabBar ? "" : undefined} data-capped={capped ? "" : undefined} data-rail={railAlways ? "" : undefined} data-foot={foot != null ? "" : undefined} className={join("basalt-app-shell", className)}>
      <aside className="basalt-app-sidebar">
        <div className="basalt-app-brand">
          <a href={homeHref} aria-label={brandLabel} className="basalt-site-brand">
            <span className="basalt-site-brand-mark basalt-app-brand-full">{brand}</span>
            <span className="basalt-site-brand-mark basalt-app-brand-rail">{brandMark ?? brand}</span>
          </a>
        </div>
        <TooltipProvider>
          <NavRailContext.Provider value={rail}>
            <div className="basalt-app-nav">{sidebar}</div>
            {account || version || footnote != null ? (
              <div className="basalt-app-account">
                {account}
                {footnote}
                {version ? (
                  <div className="basalt-app-version">
                    <VersionPlaceContext.Provider value={rail ? "rail" : "foot"}><RailTooltipContext.Provider value={LazyRailTooltip}>{version}</RailTooltipContext.Provider></VersionPlaceContext.Provider>
                  </div>
                ) : null}
              </div>
            ) : null}
          </NavRailContext.Provider>
        </TooltipProvider>
      </aside>
      <div className="basalt-app-column">
        {header}
        {banner}
        <main {...mainProps} className={join("basalt-app-main", mainProps?.className)}>{children}</main>
        {foot != null ? <div className="basalt-app-foot" data-pinned-edge="bottom">{foot}</div> : null}
      </div>
      {version ? <VersionContext.Provider value={version}>{more}</VersionContext.Provider> : more}
    </div>
    </AppTitleContext.Provider>
  );
}

export interface AppBrandProps extends React.ComponentProps<"span"> {
  /** The app's mark: its own drawing (an `svg`, an image, a `BrandSvg`). Basalt draws no box, fill or rim round it. */
  mark: React.ReactNode;
  /** The app's name: 14/20 at 600, one line, cut with an ellipsis (the link's whole name is `brandLabel`). */
  title: string;
  /** A second line under it (a team, an environment): 12/16 at 400 in secondary, one line, cut. */
  subtitle?: string;
}

/**
 * An app's lockup: its mark in a square seat, then its name over a second line. The seat is 36 with a subtitle (20 + 16 = 36, the lines' height)
 * and 32 without, hidden from assistive technology. In the rail only the mark is drawn, at 32, so `brand={<AppBrand … />}` alone serves the sidebar,
 * the rail and a `SiteHeader`. The subtitle is secondary, never tertiary: the lockup also sits on the smoked site bar.
 */
export function AppBrand({ mark, title, subtitle, className, ...props }: AppBrandProps) {
  return (
    <span {...props} data-subtitle={subtitle ? "" : undefined} className={join("basalt-app-lockup", className)}>
      <span className="basalt-app-lockup-mark" aria-hidden="true">{mark}</span>
      <span className="basalt-app-lockup-lines">
        <span className="basalt-app-lockup-title">{title}</span>
        {subtitle ? <span className="basalt-app-lockup-subtitle">{subtitle}</span> : null}
      </span>
    </span>
  );
}

export interface AppFootnoteProps extends React.ComponentProps<"div"> {
  /** The first line: 12/16 in secondary ("Signed in as Dana Okafor", "Workspace: Northwind"). */
  children: React.ReactNode;
  /** A second line: 12/16 in tertiary (secondary under more contrast). */
  detail?: React.ReactNode;
  /** A ghost `sm` control at the end ("Switch"), hung by `edge="end"`. */
  action?: React.ReactNode;
  /** The rail's form: the app's ghost `IconButton`, which opens its own `Popover` with the same words. Without it the rail draws nothing here. */
  railTrigger?: React.ReactNode;
}

/**
 * A shared note at the foot of the app's navigation (`AppShell footnote`): in the sidebar, under the account items and above the version, on the nav
 * glyphs' start edge, a divider on top; in the rail its `railTrigger` alone, centred above the version; under 720 a row of `TabBarMore`'s sheet,
 * above the version row, at least 44 tall. The lines and the trigger are both in the markup and the stylesheet shows the one that fits.
 */
export function AppFootnote({ children, detail, action, railTrigger, className, ...props }: AppFootnoteProps) {
  const place = React.useContext(VersionPlaceContext);
  return (
    <div {...props} data-place={place === "more" ? "more" : undefined} className={join("basalt-app-footnote", className)}>
      <div className="basalt-app-footnote-row">
        <div className="basalt-app-footnote-lines">
          <span className="basalt-app-footnote-line">{children}</span>
          {detail != null ? <span className="basalt-app-footnote-detail">{detail}</span> : null}
        </div>
        {action != null ? <span className="basalt-app-footnote-action">{action}</span> : null}
      </div>
      {railTrigger != null && place !== "more" ? <div className="basalt-app-footnote-rail">{railTrigger}</div> : null}
    </div>
  );
}

export interface AppHeaderProps extends Omit<React.ComponentProps<"header">, "title" | "children"> {
  /** The page's title: the page's `h1`, 18/26 at 600. Without it the bar draws no heading, and the page gives its own `h1` with `AppPageHead`. */
  title?: string;
  /**
   * Where the title is drawn under 720. `"bar"` (the default): in the bar, one line, cut, for a short page name. `"page"`: from 720 nothing changes;
   * under 720 the bar's `h1` and facts are not drawn (the bar keeps its 56px and its actions) and the title is the page's `AppPageHead phoneOnly`, which
   * the app puts first in the shell's `main` with the same `title` and `facts`. The bar then echoes the title (18/26, one line, cut, hidden from
   * assistive technology) once the page's title has scrolled under it. The bar never grows and never takes two lines. Both headings are in the markup
   * and the stylesheet shows one, so there is one `h1` at every width; give `useRouteFocus` `shownHeading(barRef, pageRef)`.
   */
  phoneTitle?: "bar" | "page";
  /**
   * The actions at the end of the bar: ghost icon buttons and at most one primary Button. Never a danger Button. Under 720 the
   * primary stays in the bar with its words, 44 tall like the bar's other buttons, and the title gives way to it (it is cut
   * first), so keep its words short. When the last one shown is a ghost button, give it `edge="end"`: its glyph goes on the bar's line and
   * its box hangs into the bar's padding, as far as the bar's room allows (DECISIONS 336). A primary Button sits on the line with its edge.
   */
  actions?: React.ReactNode;
  /**
   * Facts under the title, on one line: what the page is about at a glance, e.g. a reference, a status (a plain `Badge` with its
   * `status`, so the word says it) and a time (`Time`). Each child is one fact; they are joined by a dot (`DotLine`), at 13/18 in
   * secondary ink, and the line is cut with an ellipsis when it is too long. The title and the line are 44 tall together, centred in
   * the 56px bar at every width.
   */
  facts?: readonly React.ReactNode[];
  /**
   * The opaque form: the same bar on `surface-page`, with no blur. For an app whose content does not scroll under the
   * header (N1's chrome is solid, DECISIONS 1). There is one smoked surface per viewport, ever.
   */
  solid?: boolean;
  /**
   * The title's `h1`, for `useRouteFocus`'s `target`. The `h1` takes `tabIndex={-1}`, so script can land focus on it after a page change (with no
   * ring: nothing operates it), and it is not a tab stop.
   */
  titleRef?: React.Ref<HTMLHeadingElement>;
}

/**
 * The app's header: `basalt-chrome` over the content column, 56px, sticky, the page title (and its facts, under it) then the
 * actions at the end. On a phone it spans the full width with the same geometry, the primary still in it. Smoked by default;
 * `solid` is the same bar without the layer.
 */
export function AppHeader({ title, phoneTitle = "bar", actions, facts, solid = false, titleRef, className, ref: given, ...props }: AppHeaderProps) {
  const own = React.useRef<HTMLHeadingElement | null>(null);
  const titleSet = useMergedRef(own, titleRef);
  const bar = React.useRef<HTMLElement | null>(null);
  const barSet = useMergedRef(bar, given);
  const page = phoneTitle === "page" && title !== undefined;
  const shell = React.useContext(AppTitleContext);
  const pageHeading = page ? shell?.heading ?? null : null;
  const echo = useEcho(bar, pageHeading);
  useHeadingHandoff(own, pageHeading);
  // Development only: a page title moved to the page needs the page's head, or the page has no `h1` under 720.
  const latest = React.useRef(pageHeading);
  latest.current = pageHeading;
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !page || !shell) return undefined;
    const timer = window.setTimeout(() => {
      if (!latest.current) console.warn('Basalt AppHeader: phoneTitle="page" found no AppPageHead phoneOnly in the shell\'s main, so the page has no h1 under 720. Put one first in main with the same title.');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page, shell]);
  const heading = title !== undefined ? <h1 ref={titleSet} tabIndex={-1} className="basalt-app-title">{title}</h1> : null;
  // A fact that is null, undefined, false or empty is left out with its dot, as DotLine leaves out its own.
  const shown = facts?.filter((fact) => fact !== null && fact !== undefined && fact !== false && fact !== "") ?? [];
  return (
    <header {...props} ref={barSet} data-solid={solid ? "" : undefined} data-phone-title={page ? "page" : undefined} data-pinned-edge="top" className={join("basalt-chrome basalt-app-header", className)}>
      <div className="basalt-app-bar">
        {page ? <span className="basalt-app-echo" aria-hidden="true" data-shown={echo ? "" : undefined}>{title}</span> : null}
        {heading === null ? null : shown.length > 0 ? (
          <div className="basalt-app-heading">
            {heading}
            <p className="basalt-app-facts"><DotLine>{shown.map((fact, index) => <React.Fragment key={index}>{fact}</React.Fragment>)}</DotLine></p>
          </div>
        ) : heading}
        <span className="basalt-bar-spacer" />
        {actions ? <div className="basalt-bar-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * The echo of a page title on a phone: shown once the page's title has passed under the bar's real bottom edge (measured, the top safe area
 * included), by one `IntersectionObserver` whose top margin is the bar's bottom, re-armed on resize. Without script it stays hidden.
 */
function useEcho(bar: React.RefObject<HTMLElement | null>, heading: HTMLElement | null): boolean {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const header = bar.current;
    if (!heading || !header || typeof IntersectionObserver === "undefined") { setShown(false); return undefined; }
    let observer: IntersectionObserver | undefined;
    const arm = () => {
      observer?.disconnect();
      const edge = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
      observer = new IntersectionObserver(([entry]) => {
        if (!entry) return;
        // Under the bar is above its edge, out of the observed band: never a heading below the window's foot, and never one not drawn (from 720).
        const drawn = entry.boundingClientRect.height > 0;
        setShown(drawn && !entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? edge));
      }, { rootMargin: `-${edge}px 0px 0px 0px` });
      observer.observe(heading);
    };
    arm();
    window.addEventListener("resize", arm);
    return () => { observer?.disconnect(); window.removeEventListener("resize", arm); };
  }, [bar, heading]);
  return shown;
}

/**
 * Focus kept on the title across 720: the bar's `h1` and the page's are one title drawn in two places, so if the width crosses 720 while one of them
 * holds focus (or held it last, and the browser let it go as it stopped being drawn), focus moves to the one now shown.
 */
function useHeadingHandoff(own: React.RefObject<HTMLElement | null>, heading: HTMLElement | null) {
  React.useEffect(() => {
    if (!heading) return undefined;
    const doc = heading.ownerDocument;
    const win = doc.defaultView;
    if (!win) return undefined;
    let held: HTMLElement | null = null;
    const into = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      held = target === heading || target === own.current ? target : null;
    };
    const list = win.matchMedia(`(width < ${breakpoint.md}px)`);
    const change = () => {
      const bar = own.current;
      if (!held || !bar) return;
      const active = doc.activeElement;
      if (active !== held && active !== doc.body && active !== null) return;
      const next = isDisplayed(heading) ? heading : isDisplayed(bar) ? bar : null;
      if (next && next !== active) { next.focus({ preventScroll: true }); held = next; }
    };
    doc.addEventListener("focusin", into, true);
    list.addEventListener("change", change);
    return () => { doc.removeEventListener("focusin", into, true); list.removeEventListener("change", change); };
  }, [own, heading]);
}
