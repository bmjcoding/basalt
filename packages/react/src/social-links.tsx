// Social links (DECISIONS 106, 107): a glyph and the service's name, one pattern for a footer and a profile.
import { EnvelopeSimpleIcon, GithubLogoIcon, InstagramLogoIcon, LinkedinLogoIcon, XLogoIcon, YoutubeLogoIcon } from "@phosphor-icons/react";
import * as React from "react";

import { IconButton } from "./button";
import { Icon } from "./icon";
import { NewTabGlyph, NewTabWords, opensNewTab } from "./new-tab";
import type { IconComponent } from "./types";
import { join } from "./utils";

/**
 * The services that have a mark: Phosphor Bold's own logos (a service Phosphor doesn't draw has no mark and is the word alone, never
 * a stand-in), and the envelope for email. A mark is the glyph before the name; leave `service` out for a word alone.
 */
export type SocialService = "github" | "x" | "linkedin" | "instagram" | "youtube" | "email";

const MARKS: Record<SocialService, IconComponent> = {
  github: GithubLogoIcon,
  x: XLogoIcon,
  linkedin: LinkedinLogoIcon,
  instagram: InstagramLogoIcon,
  youtube: YoutubeLogoIcon,
  email: EnvelopeSimpleIcon,
};

/** The glyph's size: 16 beside 12 to 16px text, 20 beside 18 to 24px (the status seat's rule). The link takes its container's text size. */
export type SocialSize = 16 | 20;

interface RowState {
  size: SocialSize;
  iconOnly: boolean;
}
const RowContext = React.createContext<RowState>({ size: 16, iconOnly: false });

export interface SocialLinksProps extends React.ComponentProps<"ul"> {
  /** The glyph beside the name: 16 beside 12 to 16px text (default), 20 beside 18 to 24px. */
  size?: SocialSize;
  /**
   * Marks only, for a row made entirely of services that have a mark (an author card): each link is a ghost icon button rendered as a
   * link, 32px (44 on touch), named for its service. A row that needs a service without a mark, or Email, is the labelled row.
   */
  iconOnly?: boolean;
}

/**
 * A row of social links: `space-4` apart, wrapping. On touch each link is at least 44 by 44, and the 16px gap becomes 8px of hit area on
 * either side, so wrapped lines touch and never overlap. Put `SocialLink`s in it, and give it a name (`aria-label`).
 */
export function SocialLinks({ size = 16, iconOnly = false, className, children, ...props }: SocialLinksProps) {
  const value = React.useMemo(() => ({ size, iconOnly }), [size, iconOnly]);
  return (
    <ul {...props} data-icon-only={iconOnly ? "" : undefined} className={join("basalt-social-links", className)}>
      <RowContext.Provider value={value}>{children}</RowContext.Provider>
    </ul>
  );
}

export interface SocialLinkProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** The service's mark. Leave it out for a service without one: the word alone, with no empty seat. */
  service?: SocialService;
  /** The service's name. It is also the link's accessible name. */
  children: string;
  /** The words a link that opens a new tab adds to its name, for translation. The arrow and the words come from `target="_blank"` alone. */
  newTabLabel?: string;
}

/**
 * A glyph and the service's name. The name is underlined in `border-input` (brightening to its ink on hover), the glyph never is; both are
 * secondary at rest and primary on hover and on focus, with the control ring. The link opens in the same tab unless `target="_blank"`,
 * which draws the core arrow after the name (none on `mailto:`, none in an icon-only row, where the phrase stays in its name).
 */
export function SocialLink({ service, children, target, rel, newTabLabel, className, ...props }: SocialLinkProps) {
  const row = React.useContext(RowContext);
  const mark = service ? MARKS[service] : undefined;
  const newTab = opensNewTab(target);
  if (row.iconOnly && mark) {
    return (
      <li className="basalt-social-item">
        <IconButton variant="ghost" size="md" icon={mark} label={children} newTabLabel={newTabLabel} nativeButton={false} render={<a {...props} target={target} rel={rel} />} />
      </li>
    );
  }
  const relationship = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
  return (
    <li className="basalt-social-item">
      <a {...props} target={target} rel={relationship} data-service={service} data-new-tab={newTab ? "" : undefined} className={join("basalt-social-link", className)}>
        {mark ? <Icon icon={mark} size={row.size} /> : null}
        <span className="basalt-social-name">
          {children}
          {newTab && !props.href?.startsWith("mailto:") ? <NewTabGlyph /> : null}
          {newTab ? <NewTabWords label={newTabLabel} /> : null}
        </span>
      </a>
    </li>
  );
}

export type ProfileLinksProps = React.ComponentProps<"ul">;

/**
 * The long form of a profile: a list of rows, the glyph in the row's seat, the handle as the hint. A row for a service without a mark keeps
 * an empty seat (the glyph's 16px and the row's gap, on the start side), only when another row in the list has a glyph, so every name
 * starts at one x.
 */
export function ProfileLinks({ className, ...props }: ProfileLinksProps) {
  return <ul {...props} className={join("basalt-profile-links", className)} />;
}

export interface ProfileLinkProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** The service's mark. Leave it out for a service without one: its row keeps the empty seat. */
  service?: SocialService;
  /** The service's name. */
  children: string;
  /** The account, as the row's hint: `@handle`, `in/handle`, an address. */
  handle?: string;
  newTabLabel?: string;
}

export function ProfileLink({ service, children, handle, target, rel, newTabLabel, className, ...props }: ProfileLinkProps) {
  const mark = service ? MARKS[service] : undefined;
  const newTab = opensNewTab(target);
  const relationship = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
  return (
    <li className="basalt-profile-item">
      <a {...props} target={target} rel={relationship} data-service={service} data-new-tab={newTab ? "" : undefined} className={join("basalt-profile-link", className)}>
        {mark ? <Icon icon={mark} size={16} /> : null}
        <span className="basalt-profile-name">
          {children}
          {newTab && !props.href?.startsWith("mailto:") ? <NewTabGlyph /> : null}
          {newTab ? <NewTabWords label={newTabLabel} /> : null}
        </span>
        {handle ? <span className="basalt-profile-handle">{handle}</span> : null}
      </a>
    </li>
  );
}
