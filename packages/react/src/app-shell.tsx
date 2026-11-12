import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { TooltipProvider } from "./display";
import { NavRailContext } from "./nav";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";

// The app shell (decisions 96): a sidebar at 1024 and up, the rail from 720 to 1023, the phone tab bar under 720, and one
// header over the content column. The document is the scroller, never an inner pane. The layout lengths are tokens
// (size-sidebar-width, size-rail-width, size-header, size-tab-bar and the breakpoints; decision 101).

export interface AppShellProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The brand in the sidebar's 56px band: the lockup (mark and word). It links home and draws no line of its own. */
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
  /** The `AppHeader`: it spans the content column only, never the sidebar. */
  header: React.ReactNode;
  /** The phone `TabBar`, for an app with three or more destinations. Content pads past it, and toasts sit above it. */
  tabBar?: React.ReactNode;
  /** Props for the `main` element, e.g. an `id` for a skip link. */
  mainProps?: Omit<React.ComponentProps<"main">, "children">;
  /** The page. */
  children?: React.ReactNode;
}

/**
 * The shell of an app: a sidebar (256px, `surface-page`, edged by a 1px divider, sticky at `100dvh`, scrolling its own list
 * only when it overflows), the rail from 720 to 1023 (72px), and under 720 the tab bar instead. The header sits over the
 * content column and sticks to the document, which is what scrolls: set `scrollbar-gutter: stable` on the page (the shell
 * does for the document it is in), and give the viewport meta `viewport-fit=cover` so the safe-area insets work.
 */
export function AppShell({ brand, brandLabel, homeHref = "/", brandMark, sidebar, account, header, tabBar, mainProps, className, children, ...props }: AppShellProps) {
  const rail = useMediaQuery(`(width < ${breakpoint.lg}px)`);
  return (
    <div {...props} data-tabbar={tabBar ? "" : undefined} className={join("basalt-app-shell", className)}>
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
            {account ? <div className="basalt-app-account">{account}</div> : null}
          </NavRailContext.Provider>
        </TooltipProvider>
      </aside>
      <div className="basalt-app-column">
        {header}
        <main {...mainProps} className={join("basalt-app-main", mainProps?.className)}>{children}</main>
      </div>
      {tabBar}
    </div>
  );
}

export interface AppHeaderProps extends Omit<React.ComponentProps<"header">, "title" | "children"> {
  /** The page's title: the page's `h1`, 18/26 at 600. */
  title: string;
  /** The actions at the end of the bar: ghost icon buttons and at most one primary Button. Never a danger Button. */
  actions?: React.ReactNode;
  /**
   * The opaque form: the same bar on `surface-page`, with no blur. For an app whose content does not scroll under the
   * header (N1's chrome is solid, DECISIONS 1). There is one smoked surface per viewport, ever.
   */
  solid?: boolean;
}

/**
 * The app's header: `basalt-chrome` over the content column, 56px, sticky, the page title then the actions at the end.
 * On a phone it spans the full width with the same geometry. Smoked by default; `solid` is the same bar without the layer.
 */
export function AppHeader({ title, actions, solid = false, className, ...props }: AppHeaderProps) {
  return (
    <header {...props} data-solid={solid ? "" : undefined} className={join("basalt-chrome basalt-app-header", className)}>
      <div className="basalt-app-bar">
        <h1 className="basalt-app-title">{title}</h1>
        <span className="basalt-bar-spacer" />
        {actions ? <div className="basalt-bar-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
