import * as React from "react";

import { DotSep } from "./dot-sep";
import { formatReleaseDate } from "./release-date";
import { join } from "./utils";
import { RailTooltipContext, VersionPlaceContext } from "./version-place";

// The version with its ship date, as one link to the release notes at that version (DECISIONS 320, 1.2): "Version 1.4.0 · Nov 23, 2026". It
// shows the version this session runs. It is the only way to the release notes (there is no "What's new" item), and nothing marks a release as
// new. 12/16 Geist in secondary ink, tabular, lifting to primary with an underline on hover; on the release notes it is the current page, its
// number at 600 with its width reserved. Two parts never break inside, the word with the number and the date: when both do not fit one line the
// date goes under the number and the dot is not drawn. 24 tall on a fine pointer, a 44px hit box on touch that moves nothing.
//
// Its place decides its form, set by the part that holds it: at the sidebar's foot under the account items; in the rail (720 to 1023) the
// number alone, centred, the label and the date in its name and its tooltip; the last row of More's sheet on a phone, at 13/18; after the legal
// line in a site's footer, at 13/18, labelled with the product. An app whose tab bar has no More draws it on its account or settings page.

export interface VersionLinkProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** SemVer without build metadata: "1.4.0", "2.0.0-rc.2". */
  version: string;
  /** The day it shipped, an ISO calendar date ("2026-11-23"). Drawn "Nov 23, 2026" and never moved by a time zone. */
  date: string;
  /** The release notes at this version: "/release-notes#v1.4.0". */
  href: string;
  /** The word before the number. Default "Version"; a site's footer gives the product ("Basalt"). */
  label?: string;
  /** The end of the link's name. Default "release notes". */
  destinationLabel?: string;
  /** This page is the release notes. */
  current?: boolean;
  /** Default "en-US". */
  locale?: string;
}

/** The number, with a pre-release's hyphen kept with what follows it, so where the line is short it breaks before the hyphen. */
function VersionNumber({ version }: { version: string }) {
  const at = version.indexOf("-");
  if (at < 0) return <>{version}</>;
  return <>{version.slice(0, at)}<wbr /><span className="basalt-version-link-pre">{version.slice(at)}</span></>;
}

/** The version with its ship date, one link to the release notes at that version. See the module note. */
export function VersionLink({ version, date, href, label = "Version", destinationLabel = "release notes", current = false, locale = "en-US", className, ...props }: VersionLinkProps) {
  const place = React.useContext(VersionPlaceContext);
  const day = formatReleaseDate(date, locale);
  const rail = place === "rail";
  const RailTooltip = React.useContext(RailTooltipContext);
  const link = (
    <a
      {...props}
      href={href}
      // The visible words in order, joined as they are read, then where it goes (WCAG 2.5.3 and 2.4.4). The parts are flex items, whose text a
      // name would join with stray spaces ("1.4.0 , Nov 23"), so the name is written whole.
      aria-label={props["aria-label"] ?? `${label} ${version}, ${day}, ${destinationLabel}`}
      aria-current={current ? "page" : props["aria-current"]}
      data-place={place ?? undefined}
      className={join("basalt-version-link", className)}
    >
      <span className="basalt-version-link-words">
        {/* A no-break space: the word and the number are one part. */}
        <span className="basalt-version-link-word">{label}{"\u00a0"}</span>
        <span className="basalt-version-link-number" data-label={version}><span><VersionNumber version={version} /></span></span>
      </span>
      {" "}
      <span className="basalt-version-link-date">
        <time dateTime={date}>{day}</time>
      </span>
    </a>
  );
  if (!rail || !RailTooltip) return link;
  return <RailTooltip content={<>{label} {version}<DotSep spaced />{day}</>} side="right">{link}</RailTooltip>;
}
