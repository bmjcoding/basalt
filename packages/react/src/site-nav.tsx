import * as React from "react";

import { GlidePlate } from "./plate";
import { join } from "./utils";

// The pill link list of a site (DECISIONS 146 C): the site header's links, as a part a site's own bar and the footer use too, so four sites never rebuild the
// glide, the 44 hit area, the current page, the first key and the narrow menu's focus. `md` is the bar's link (14/20 on a 32px pill in a 44px hit area); `sm` is
// the footer's (13/18 on a 28px pill in a 32px hit area, 44 on touch). In a row or a column, a column's hit areas touching as a row's do. One shared pill glides
// between the links of a list with `Nav`'s rules (in place on entry, frozen and faded on leave, hidden by the first key, off on touch, under reduced motion and in
// forced colours, where each link paints its own).

/** One link in a bar, a footer and the narrow menu. */
export interface SiteHeaderLink {
  href: string;
  /** The link's words. It is also its name, so keep it short; five links at most fit beside the brand at 720. */
  label: string;
  /** This link is the current page: `aria-current="page"`, primary ink at 600, no background. */
  current?: boolean;
}

export interface SiteNavLinkProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** This link is the current page: `aria-current="page"`, primary ink at 600 with its 600 width reserved, no background. */
  current?: boolean;
  /** The words. They are the link's name, and the 600 width is reserved from them. */
  children: string;
}

/** One pill link, for a list of your own inside `SiteNavList` (or a site's own markup that holds the glide's host). */
export function SiteNavLink({ current = false, children, className, ...props }: SiteNavLinkProps) {
  return (
    <a {...props} aria-current={current ? "page" : props["aria-current"]} className={join("basalt-site-link", className)}>
      <span className="basalt-site-pill">
        <span className="basalt-site-label" data-label={children}>{children}</span>
      </span>
    </a>
  );
}

interface ListProps {
  /** `md` is the bar's link, `sm` the footer's. Default `md`. */
  size?: "md" | "sm";
  /** A row (default) or a column. */
  orientation?: "row" | "column";
  /** Pulls the list out by its pill's padding, so the words line up with an edge (a footer group's label) and not the pills. Never past `space-1-5` of the window's edge. */
  hang?: boolean;
  links: SiteHeaderLink[];
}

function List({ links, labelledBy }: { links: SiteHeaderLink[]; labelledBy?: string }) {
  return (
    <>
      <GlidePlate navigation />
      <ul aria-labelledby={labelledBy} className="basalt-site-links-list">
        {links.map((link) => (
          <li key={link.href + link.label}><SiteNavLink href={link.href} current={link.current}>{link.label}</SiteNavLink></li>
        ))}
      </ul>
    </>
  );
}

export interface SiteNavProps extends ListProps, Omit<React.ComponentProps<"nav">, "children"> {
  /** The landmark's name. Default "Primary". */
  "aria-label"?: string;
}

/** The pill links as a `nav` landmark: the bar's links. */
export function SiteNav({ size = "md", orientation = "row", hang = false, links, className, ...props }: SiteNavProps) {
  return (
    <nav aria-label="Primary" {...props} data-size={size} data-orientation={orientation} data-hang={hang ? "" : undefined} className={join("basalt-site-links", className)}>
      <List links={links} />
    </nav>
  );
}

export interface SiteNavListProps extends ListProps, Omit<React.ComponentProps<"div">, "children"> {}

/**
 * The same list with no landmark of its own, for a group inside a `nav` that is already one (the footer's links are one `nav` named "Footer" and each group is a
 * labelled list). Name the list with `aria-labelledby` on its heading.
 */
export function SiteNavList({ size = "md", orientation = "row", hang = false, links, className, "aria-labelledby": labelledBy, ...props }: SiteNavListProps) {
  return (
    <div {...props} data-size={size} data-orientation={orientation} data-hang={hang ? "" : undefined} className={join("basalt-site-links", className)}>
      <List links={links} labelledBy={labelledBy} />
    </div>
  );
}
