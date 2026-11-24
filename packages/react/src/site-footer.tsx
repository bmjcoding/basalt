import * as React from "react";

import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { Icon } from "./icon";
import { SiteNavList } from "./site-nav";
import type { SiteHeaderLink } from "./site-nav";
import { ThemeChoiceControl } from "./theme-choice";
import type { ThemeChoiceWords } from "./theme-choice";
import { join } from "./utils";
import { VersionPlaceContext } from "./version-place";

// The site footer (DECISIONS 146 A): the end of every site page, on the page at level 0 with no fill, rim or shadow. The brand, an optional sentence and social links; the
// links, either one unlabelled line of up to six beside the brand or labelled groups; then the base: the legal line and the theme choice, both required. One 1px divider the
// width of the row, never full-bleed, with half a section gap above it. Under 720 a labelled group is a disclosure (a 44px row with the label and a chevron, closed unless it
// holds the current page; without script every group is open, two a row). All the links are one `nav` named "Footer"; a group's label is an `h2` in sentence case.

/** A labelled group of links in the footer. */
export interface SiteFooterGroup {
  /** The group's label: sentence case, an `h2`. */
  label: string;
  links: SiteHeaderLink[];
}

export interface SiteFooterProps extends Omit<React.ComponentProps<"footer">, "children"> {
  /** The brand: a `SiteBrand`. Optional. */
  brand?: React.ReactNode;
  /** One plain sentence about the site, at most `size-prose-width`. Optional. */
  note?: React.ReactNode;
  /** The social links (`SocialLinks`). Optional. */
  social?: React.ReactNode;
  /** The line form: one unlabelled list of up to six links, beside the brand. Use this or `groups`. */
  links?: SiteHeaderLink[];
  /** Labelled groups of links. From 1024 they are four a row beside the brand; under 720 each is a disclosure. Use this or `links`. */
  groups?: SiteFooterGroup[];
  /** The legal line: required. At most `size-prose-width`, in tertiary ink. */
  legal: React.ReactNode;
  /** The version, as a `VersionLink` labelled with the product ("Basalt 0.2.0 · Nov 23, 2026"), on the legal line's row after it, at its 13/18. */
  version?: React.ReactNode;
  /** The links' landmark name. Default "Footer". */
  navLabel?: string;
  /** The theme choice's words, for translation. The theme choice is always in the footer, since the site header has none. */
  themeWords?: ThemeChoiceWords;
}

function Group({ group, id }: { group: SiteFooterGroup; id: string }) {
  const [open, setOpen] = React.useState(() => group.links.some((link) => link.current));
  const list = `${id}-list`;
  return (
    <div className="basalt-site-footer-group" data-open={open ? "" : undefined}>
      <h2 id={id} className="basalt-site-footer-label">
        <span className="basalt-site-footer-label-wide">{group.label}</span>
        <button type="button" aria-expanded={open} aria-controls={list} className="basalt-site-footer-toggle" onClick={() => setOpen((now) => !now)}>
          <span>{group.label}</span>
          <Icon icon={ChevronDownGlyph} size={16} />
        </button>
      </h2>
      <SiteNavList id={list} size="sm" orientation="column" hang aria-labelledby={id} links={group.links} />
    </div>
  );
}

/**
 * The site footer. Put it last on the page, after `main`, inside `SitePage` so a short page keeps it at the window's foot. The site's own: its words, which groups and
 * links, the note, the brand, the legal text and what the footer sits on (a mass). Basalt's: the order, the pill links at `sm`, the disclosures, the divider and the theme choice.
 */
export function SiteFooter({ brand, note, social, links, groups, legal, version, navLabel = "Footer", themeWords, className, ...props }: SiteFooterProps) {
  const base = React.useId();
  // Disclosures are drawn once script has run: without it every group is open and two a row.
  const [wired, setWired] = React.useState(false);
  React.useEffect(() => setWired(true), []);
  const form = groups?.length ? "groups" : links?.length ? "line" : "none";
  const identity = brand || note || social;
  return (
    <footer {...props} data-form={form} data-wired={wired ? "" : undefined} className={join("basalt-site-footer", className)}>
      <div className="basalt-page-row">
      <div className="basalt-site-footer-body">
        <div className="basalt-site-footer-top">
          {identity ? (
            <div className="basalt-site-footer-id">
              {brand}
              {note ? <p className="basalt-site-footer-note">{note}</p> : null}
              {social}
            </div>
          ) : null}
          {form === "none" ? null : (
            <nav aria-label={navLabel} className="basalt-site-footer-links">
              {form === "groups" ? (
                <div className="basalt-site-footer-groups">
                  {groups!.map((group, index) => <Group key={group.label} group={group} id={`${base}-g${index}`} />)}
                </div>
              ) : (
                <SiteNavList size="sm" links={links!} />
              )}
            </nav>
          )}
        </div>
        <div className="basalt-site-footer-base">
          {version ? (
            <div className="basalt-site-footer-legal-row">
              <p className="basalt-site-footer-legal">{legal}</p>
              <VersionPlaceContext.Provider value="footer">{version}</VersionPlaceContext.Provider>
            </div>
          ) : <p className="basalt-site-footer-legal">{legal}</p>}
          <ThemeChoiceControl words={themeWords} />
        </div>
      </div>
      </div>
    </footer>
  );
}

/**
 * The page as a column at least `100svh` tall whose `main` takes the rest, so on a short page the footer sits at the window's foot and on a long page it simply ends the
 * page. `svh`, so a phone's collapsing toolbar never moves it.
 */
export function SitePage({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-site-page", className)} />;
}
