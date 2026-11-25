import * as React from "react";

import { Tooltip } from "./display";
import { ControlIcon } from "./control-icon";
import { GlidePlate } from "./plate";
import type { IconComponent } from "./types";
import { join } from "./utils";

// Navigation: a sidebar and its collapsed rail. The item is a 48px pill that hugs its glyph and label; hover is that pill
// at the selected wash; the current page is the selected glyph and a 600 label with no background. One shared pill glides
// between hovered items (plate.tsx), over each item painting its own pill, which is the whole story with no script.

/** Whether the list is the collapsed rail. Set by `Nav`, read by its items. */
const NavContext = /* @__PURE__ */ React.createContext(false);
/** The list's size. Set by `Nav`, read by its items for their glyph's size. */
const NavSizeContext = /* @__PURE__ */ React.createContext<NavSize>("md");

/**
 * `md`: the app's navigation, a 48px pill at 18/26 (`text-lg`) with a 24 glyph. `sm`: a second, quieter list under it (recent items,
 * saved views, a workspace's projects), a 32px pill at 13/18 with a 16 glyph.
 */
export type NavSize = "md" | "sm";

/**
 * Whether the app shell is showing the rail. `AppShell` sets it, so the `Nav`s it holds collapse by the width of the page
 * without the app measuring anything; a `collapsed` prop on a `Nav` still wins.
 */
export const NavRailContext = /* @__PURE__ */ React.createContext(false);

export interface NavProps extends Omit<React.ComponentProps<"nav">, "aria-label" | "aria-labelledby"> {
  /** The landmark's name, e.g. "Primary" or the product's. Required: an app may have several navigations. */
  "aria-label": string;
  /**
   * The rail: a 48px circle around each glyph, with the label as the item's name and in a tooltip. Left unset, inside
   * `AppShell` it follows the shell's width (the rail from 720 to 1023); anywhere else it is the sidebar's full form.
   */
  collapsed?: boolean;
  /**
   * `md` (default): the app's navigation, a 48px pill at 18/26 (`text-lg`) with the glyph at 24. `sm`: a second list under it, a 32px pill at
   * 13/18 (`text-sm`) with the glyph at 16, the same hover, glide, current page and ring. Compact steps it to 28; on touch it is 44.
   */
  size?: NavSize;
}

/**
 * The navigation of an app: a column of `NavItem`s, optionally in `NavGroup`s. Hover is a fully round pill at the
 * selected wash that hugs the glyph and the label, never the column's width, and one shared pill glides between items
 * (150ms, ease-out); the first key hides it and the focus ring shows. The current page is its selected glyph and a 600
 * label, with no background and no bar. The column keeps `space-1-5` of inline padding so the focus ring never clips.
 */
export function Nav({ collapsed: collapsedProp, size = "md", className, children, ...props }: NavProps) {
  const rail = React.useContext(NavRailContext);
  const collapsed = collapsedProp ?? rail;
  return (
    <nav {...props} data-collapsed={collapsed ? "" : undefined} data-size={size === "md" ? undefined : size} className={join("basalt-nav", className)}>
      <GlidePlate navigation />
      <NavContext.Provider value={collapsed}>
        <NavSizeContext.Provider value={size}>
          <ul className="basalt-nav-list">{children}</ul>
        </NavSizeContext.Provider>
      </NavContext.Provider>
    </nav>
  );
}

export interface NavGroupProps extends Omit<React.ComponentProps<"li">, "children"> {
  /** The group's name. Drawn above its items in the sidebar; in the rail it stays the group's accessible name. */
  label: string;
  children?: React.ReactNode;
}

/** A labelled group of items inside `Nav`. */
export function NavGroup({ label, className, children, ...props }: NavGroupProps) {
  const collapsed = React.useContext(NavContext);
  const id = React.useId();
  return (
    <li {...props} className={join("basalt-nav-group", className)}>
      <span id={id} className={collapsed ? "basalt-visually-hidden" : "basalt-nav-group-label"}>{label}</span>
      <ul aria-labelledby={id} className="basalt-nav-list">{children}</ul>
    </li>
  );
}

export interface NavItemProps extends Omit<React.ComponentProps<"a">, "children"> {
  /**
   * The item's glyph: a core glyph (`HomeGlyph`), drawn at 24 (16 in a `size="sm"` list) and in its selected form when the item is current. Leave it
   * out for a row of words alone (the site header's narrow menu): the same 48px pill at 18/26, with no glyph and no seat for
   * one. The rail needs glyphs, so a list that collapses gives every item one.
   */
  icon?: IconComponent;
  /** The label. In the rail it is the item's name and its tooltip. */
  children: string;
  /** This item is the current page: `aria-current="page"`, the selected glyph and a 600 label. */
  current?: boolean;
  /** A count, drawn after the label as a number. In the rail it is spoken with the name and not drawn. */
  count?: number | string;
  /** Something new here, drawn as a small dot in the label's ink. The words are spoken with the name, e.g. "New activity". */
  dot?: string;
}

/** One link in `Nav`. */
export function NavItem({ icon, children, current = false, count, dot, className, ...props }: NavItemProps) {
  const collapsed = React.useContext(NavContext);
  const size = React.useContext(NavSizeContext);
  const link = (
    <a {...props} aria-current={current ? "page" : props["aria-current"]} data-glyphless={icon ? undefined : ""} className={join("basalt-nav-item", className)}>
      <span className="basalt-nav-pill">
        {icon ? <ControlIcon icon={icon} size={size === "sm" ? 16 : 24} selected={current} eager={current} /> : null}
        <span className={collapsed ? "basalt-visually-hidden" : "basalt-nav-label"} data-label={collapsed ? undefined : children}>{children}</span>
        {count !== undefined ? <span className={collapsed ? "basalt-visually-hidden" : "basalt-nav-count"}><span className="basalt-visually-hidden">, </span>{count}</span> : null}
        {dot ? (
          <>
            {collapsed ? null : <span className="basalt-nav-dot" aria-hidden="true" />}
            <span className="basalt-visually-hidden">, {dot}</span>
          </>
        ) : null}
      </span>
    </a>
  );
  return <li className="basalt-nav-entry">{collapsed ? <Tooltip content={children} side="right">{link}</Tooltip> : link}</li>;
}
