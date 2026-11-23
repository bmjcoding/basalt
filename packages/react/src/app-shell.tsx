import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { Tooltip, TooltipProvider } from "./display";
import { DotLine } from "./dot-sep";
import { NavRailContext } from "./nav";
import { usePinnedEdges } from "./pinned-edges";
import { useScreenKeyboardLayout } from "./screen-keyboard";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";
import { RailTooltipContext, VersionContext, VersionPlaceContext } from "./version-place";

// The app shell (decisions 96): a sidebar at 1024 and up, the rail from 720 to 1023, the phone tab bar under 720, and one
// header over the content column. The document is the scroller, never an inner pane (a page's own pane beside it is
// `PaneLayout`, sticky, like the sidebar). The layout lengths are tokens (size-sidebar-width, size-rail-width, size-header,
// size-tab-bar and the breakpoints; decision 101). The capped form is --basalt-shell-width wide at most, centred: by default
// size-sidebar-width plus size-page-width, so at the cap the column is exactly the page's own cap.

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
export function AppShell({ brand, brandLabel, homeHref = "/", brandMark, sidebar, account, version, header, tabBar, foot, mainProps, capped = false, className, children, ...props }: AppShellProps) {
  const rail = useMediaQuery(`(width < ${breakpoint.lg}px)`);
  useScreenKeyboardLayout();
  usePinnedEdges(foot != null);
  return (
    <div {...props} data-tabbar={tabBar ? "" : undefined} data-capped={capped ? "" : undefined} data-foot={foot != null ? "" : undefined} className={join("basalt-app-shell", className)}>
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
            {account || version ? (
              <div className="basalt-app-account">
                {account}
                {version ? (
                  <div className="basalt-app-version">
                    <VersionPlaceContext.Provider value={rail ? "rail" : "foot"}><RailTooltipContext.Provider value={Tooltip}>{version}</RailTooltipContext.Provider></VersionPlaceContext.Provider>
                  </div>
                ) : null}
              </div>
            ) : null}
          </NavRailContext.Provider>
        </TooltipProvider>
      </aside>
      <div className="basalt-app-column">
        {header}
        <main {...mainProps} className={join("basalt-app-main", mainProps?.className)}>{children}</main>
        {foot != null ? <div className="basalt-app-foot" data-pinned-edge="bottom">{foot}</div> : null}
      </div>
      {version ? <VersionContext.Provider value={version}>{tabBar}</VersionContext.Provider> : tabBar}
    </div>
  );
}

export interface AppHeaderProps extends Omit<React.ComponentProps<"header">, "title" | "children"> {
  /** The page's title: the page's `h1`, 18/26 at 600. */
  title: string;
  /**
   * The actions at the end of the bar: ghost icon buttons and at most one primary Button. Never a danger Button. Under 720 the
   * primary stays in the bar with its words, 44 tall like the bar's other buttons, and the title gives way to it (it is cut
   * first), so keep its words short.
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
}

/**
 * The app's header: `basalt-chrome` over the content column, 56px, sticky, the page title (and its facts, under it) then the
 * actions at the end. On a phone it spans the full width with the same geometry, the primary still in it. Smoked by default;
 * `solid` is the same bar without the layer.
 */
export function AppHeader({ title, actions, facts, solid = false, className, ...props }: AppHeaderProps) {
  const heading = <h1 className="basalt-app-title">{title}</h1>;
  // A fact that is null, undefined, false or empty is left out with its dot, as DotLine leaves out its own.
  const shown = facts?.filter((fact) => fact !== null && fact !== undefined && fact !== false && fact !== "") ?? [];
  return (
    <header {...props} data-solid={solid ? "" : undefined} data-pinned-edge="top" className={join("basalt-chrome basalt-app-header", className)}>
      <div className="basalt-app-bar">
        {shown.length > 0 ? (
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
