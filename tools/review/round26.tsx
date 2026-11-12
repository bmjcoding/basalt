// Round 26: site icons, and status dots in forced colours. The council voted (decisions 106 and 107, finish-nov10 batch 7: a three-member
// round, DECISIONS 93; the votes are in .review/council/skill-parity-3-vote/ and skill-parity-3-r2-vote/) and handed the build over. This is
// that design built as decided, in React and in the HTML skill. The design panel has not reviewed this implementation, and the owner has
// not approved it. Every name, handle and address here is synthetic.
//
// The states are real. "forced-colours" is an emulation that build.mjs sets before the page loads, with the page's own palette (so each
// theme is shot as Windows' dark and light forced palettes); "forced" is the same with the pointer on the second row of the first popup,
// and a state that ends in "-lit" hovers that row without forced colours. The popups are open in every shot of the two menu steps.

import * as React from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HomeGlyph,
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Nav,
  NavItem,
  ProfileLink,
  ProfileLinks,
  SocialLink,
  SocialLinks,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "../../packages/react/src/index";
import type { BadgeStatus } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;

const STATUSES: Array<[BadgeStatus, string]> = [["neutral", "Idle"], ["success", "Ready"], ["warning", "Watching"], ["danger", "Failing"], ["accent", "Needs you"], ["pending", "In review"]];

// ---- 1. A row of social links, in a footer and under a name ----

function Row({ size = 16 }: { size?: 16 | 20 }) {
  return (
    <SocialLinks aria-label="Elsewhere" size={size}>
      <SocialLink service="github" href="#github">GitHub</SocialLink>
      <SocialLink service="x" href="#x" target="_blank">X</SocialLink>
      <SocialLink service="linkedin" href="#linkedin">LinkedIn</SocialLink>
      <SocialLink service="instagram" href="#instagram">Instagram</SocialLink>
      <SocialLink service="youtube" href="#youtube">YouTube</SocialLink>
      <SocialLink service="email" href="mailto:name@example.test">Email</SocialLink>
      <SocialLink href="#substack">Substack</SocialLink>
      <SocialLink href="#bluesky" target="_blank">Bluesky</SocialLink>
    </SocialLinks>
  );
}

function RowsDemo() {
  return (
    <div style={{ ...col, maxWidth: 720 }}>
      {caption("A footer row: 13/18 text, the glyph at 16, links 16px apart. It wraps at 390, and each link becomes at least 44 by 44 on touch.")}
      <div style={{ fontSize: 13, lineHeight: "18px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px 24px", padding: "16px 0", borderTop: "1px solid var(--basalt-border-divider)", color: "var(--basalt-text-secondary)" }}>
        <span>© 2026 Placeholder Name</span>
        <Row />
      </div>
      {caption("A profile row under a name: 14/20 text, the same link. Nothing changes but the size it inherits.")}
      <Card>
        <CardHeader><CardTitle>Placeholder Name</CardTitle></CardHeader>
        <CardContent><div style={{ fontSize: 14, lineHeight: "20px" }}><Row /></div></CardContent>
      </Card>
      {caption("Beside 18px text the glyph is 20 (size={20}).")}
      <div style={{ fontSize: 18, lineHeight: "26px" }}><Row size={20} /></div>
      {caption("X and Bluesky open a new tab: the core arrow follows the name, and \"(opens in a new tab)\" is in the name. Email has none. Substack and Bluesky have no mark: the word alone, with no glyph and no empty seat.")}
    </div>
  );
}

// ---- 2. Icon only ----

function IconOnlyDemo() {
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption("A row made entirely of marks, as on an author card: ghost icon buttons rendered as links, 32px (44 on touch), 4px apart, each named for its service.")}
      <Card>
        <CardHeader><CardTitle>Placeholder Name</CardTitle></CardHeader>
        <CardContent>
          <SocialLinks iconOnly aria-label="Elsewhere">
            <SocialLink service="github" href="#github">GitHub</SocialLink>
            <SocialLink service="x" href="#x" target="_blank">X</SocialLink>
            <SocialLink service="linkedin" href="#linkedin">LinkedIn</SocialLink>
            <SocialLink service="instagram" href="#instagram">Instagram</SocialLink>
            <SocialLink service="youtube" href="#youtube">YouTube</SocialLink>
          </SocialLinks>
        </CardContent>
      </Card>
      {caption("X opens a new tab: no arrow on a mark, and \"(opens in a new tab)\" stays in its name. A row that needs Email, Substack or Bluesky is the labelled row above.")}
    </div>
  );
}

// ---- 3. The long form ----

function LongFormDemo() {
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption("The long form: the glyph in the row's seat, the handle as the hint. Substack and Bluesky have no mark, so their rows keep an empty seat and every name starts at one x.")}
      <Card>
        <ProfileLinks aria-label="Profiles">
          <ProfileLink service="github" handle="@placeholder" href="#github">GitHub</ProfileLink>
          <ProfileLink service="x" handle="@placeholder" href="#x" target="_blank">X</ProfileLink>
          <ProfileLink service="linkedin" handle="in/placeholder" href="#linkedin">LinkedIn</ProfileLink>
          <ProfileLink service="instagram" handle="@placeholder" href="#instagram">Instagram</ProfileLink>
          <ProfileLink service="email" handle="name@example.test" href="mailto:name@example.test">Email</ProfileLink>
          <ProfileLink handle="placeholder.substack.com" href="#substack">Substack</ProfileLink>
          <ProfileLink handle="@placeholder.bsky.social" href="#bluesky">Bluesky</ProfileLink>
        </ProfileLinks>
      </Card>
      {caption("A list with no glyph in it has no seat: the names start at the row's padding.")}
      <Card>
        <ProfileLinks aria-label="Newsletters">
          <ProfileLink handle="placeholder.substack.com" href="#substack">Substack</ProfileLink>
          <ProfileLink handle="@placeholder.bsky.social" href="#bluesky">Bluesky</ProfileLink>
        </ProfileLinks>
      </Card>
    </div>
  );
}

// ---- 4. Every status, in a badge, a table cell and a list ----

function StatusDemo() {
  return (
    <div style={{ ...col, maxWidth: 720 }}>
      {caption("An outline badge in every status. With no status a badge is the word alone (a count, a fact); neutral asked for by name draws the tertiary dot. In forced colours every dot is one disc in the system text colour and pending a ring, and the edge a real border.")}
      <div style={row}>
        <Badge>3 open</Badge>
        {STATUSES.map(([status, word]) => <Badge key={status} status={status}>{word}</Badge>)}
      </div>
      {caption("A table cell: the plain badge, and running (braille takes the dot's seat, so no dot).")}
      <TableContainer>
        <Table>
          <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {STATUSES.map(([status, word]) => <TableRow key={status}><TableCell>service-{status}</TableCell><TableCell><Badge variant="plain" status={status}>{word}</Badge></TableCell></TableRow>)}
            <TableRow><TableCell>service-running</TableCell><TableCell><Badge variant="plain"><Spinner variant="braille" />Running</Badge></TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {caption("A list: a name and its status.")}
      <Card>
        <ul style={{ listStyle: "none", margin: 0, padding: 16, display: "grid", gap: 12 }}>
          {STATUSES.map(([status, word]) => <li key={status} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><Text as="span" size="base">list-{status}</Text><Badge variant="plain" status={status}>{word}</Badge></li>)}
        </ul>
      </Card>
    </div>
  );
}

// ---- 5. A lit menu row with a badge ----

function LitDemo() {
  return (
    <div style={{ minHeight: 420 }}>
      <Menu defaultOpen modal={false}>
        <MenuTrigger>Runs</MenuTrigger>
        <MenuContent>
          {STATUSES.map(([status, word]) => <MenuItem key={status}><Badge variant="plain" status={status}>{word}</Badge></MenuItem>)}
          <MenuItem><Badge status="success">Edge</Badge></MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

// ---- 6. The nav dot and a checked radio item ----

function DotsDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", minHeight: 420 }}>
      <Nav aria-label="Primary" style={{ width: 240 }}>
        <NavItem href="#home" icon={HomeGlyph}>Home</NavItem>
        <NavItem href="#activity" icon={HomeGlyph} dot="New activity">Activity</NavItem>
      </Nav>
      <Menu defaultOpen modal={false}>
        <MenuTrigger>Sort</MenuTrigger>
        <MenuContent>
          <MenuRadioGroup defaultValue="date">
            <MenuRadioItem value="name">Name</MenuRadioItem>
            <MenuRadioItem value="date">Date</MenuRadioItem>
            <MenuRadioItem value="size">Size</MenuRadioItem>
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  );
}

export const ROUND_26: Round = {
  id: "26",
  title: "Site icons, and status dots in forced colours",
  reviewed: false,
  summary:
    "The council voted (decisions 106 and 107, a three-member round; Muse was out) and handed the build over. Site links are a glyph and the service's name: a row, an icon-only row, and a profile list for the long form. In forced colours every status dot, the nav dot and the checked radio's dot are drawn as a border, so they show on Canvas and on a lit row. The implementation has not been reviewed. All names and handles are synthetic.",
  steps: [
    {
      id: "social-rows",
      name: "A row of social links",
      intro: "A glyph and the service's name, in a footer and under a name. The same link at 13/18 and at 14/20.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0: Phosphor Bold's own logos (GithubLogo, XLogo, LinkedinLogo, InstagramLogo, YoutubeLogo) and EnvelopeSimple for email. The glyph is before the name, space-1-5 apart; links are space-4 apart; the link takes its container's text size, and the glyph is 16 beside 12 to 16px text and 20 beside 18 to 24px.",
        "Decided 2 to 1 (opus: no underline): the name is underlined in border-input and brightens to its ink on hover; the glyph is never underlined. Secondary at rest, primary on hover and on focus (tested), with the control ring, and no wash, weight change or press scale.",
        "Decided 2 to 1 (opus: Newspaper and ChatCircle): Substack and Bluesky are the word alone, with no glyph and no empty seat in a row of links. Neither brand lets its mark be redrawn or recoloured.",
        "Decided 2 to 1 (grok: a profile link opens a new tab): a link opens in the same tab by default and its visible name is its accessible name. target=\"_blank\" draws the core arrow after the name (DECISIONS 95), none on mailto:.",
        "On touch each link is at least 44 by 44 as real layout, the 16px gap becoming 8px of hit area either side, so wrapped lines touch and never overlap (grok's prototype overlapped 16px). Built beyond the vote: the page's coarse-pointer margin on a standalone link is cancelled in a row.",
        "In forced colours the whole link is LinkText, glyph and arrow included.",
      ],
      tryIt: ["Hover and Tab through a row: glyph and name both lift to primary, and the underline brightens on hover.", "Narrow the window to 390: the row wraps."],
      states: ["forced-colours"],
      demo: () => <RowsDemo />,
    },
    {
      id: "social-icon-only",
      name: "Icon only, for a row of marks",
      intro: "A row made entirely of marks, as on an author card.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 400,
      decisions: [
        "Decided 2 to 1 (sol: never): icon only is allowed only for a row made entirely of marks. Ghost IconButtons rendered as links, 32px (44 on touch), space-1 apart, each named for its service, keeping IconButton's .98 press.",
        "A new-tab mark skips the arrow and keeps the phrase in its name. A row that needs Substack, Bluesky or Email is the labelled row.",
      ],
      tryIt: ["Press a mark: it scales to .98, as every IconButton does."],
      states: ["forced-colours"],
      demo: () => <IconOnlyDemo />,
    },
    {
      id: "social-long-form",
      name: "The long form: a profile list",
      intro: "The glyph in the row's seat and the handle as the hint.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Decided 3 to 0 in round 2: in a profile list whose other rows have a glyph, a service without a mark keeps an empty seat the glyph's width and the row's gap, so every name starts at one x, as the notification centre's mark seat does (opus measured the names at 40px, against 12px without the seat).",
        "Built beyond the vote: the seat is 16px plus the row's space-3 gap on the start side (it mirrors in RTL), padding and never an element, and only when a row in the list has a glyph. It is scoped to this list; a blanket rule would re-indent every menu and palette row that has no icon.",
      ],
      tryIt: ["Compare the two lists: with no glyph in the second, there is no seat."],
      states: ["forced-colours"],
      demo: () => <LongFormDemo />,
    },
    {
      id: "status-everywhere",
      name: "Every status, in a badge, a table cell and a list",
      intro: "No status, neutral by name, success, warning, danger, accent, pending and running.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 1000,
      decisions: [
        "Decided 3 to 0 (grok changed): in forced colours every settled status is one 6px disc, drawn as its own border (box-sizing border-box, a border of half size-dot, no background) with forced colours left on, so it takes the system colour of where it sits. The accent dot's CanvasText fill and the pending ring's explicit CanvasText go. The word carries the meaning.",
        "Decided 3 to 0: an explicit neutral status draws the tertiary dot in React too; a badge with no status stays the word alone (the default is now no status); a running badge draws no dot.",
        "Decided 3 to 0: the outline badge's edge is a real 1px border in the word's own ink, in forced colours. It sits where the inset shadow did, and the padding is reduced by the hairline: the box is the size it was (tested at 0px).",
        "Braille stays currentColor and is left to the browser.",
      ],
      tryIt: ["Switch to forced colours in the shots: every mark shows."],
      states: ["forced-colours"],
      demo: () => <StatusDemo />,
    },
    {
      id: "status-lit-row",
      name: "A lit menu row with a badge",
      intro: "The pointer on the second row. In forced colours the lit row is Highlight with HighlightText, and the dot follows.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Decided 3 to 0: a lit row names its status word and badge among its HighlightText parts, so the dot, ring and edge follow. Measured on a lit row: a CanvasText fill is 2.31:1 (dark) and 1.86:1 (light) against Chromium's 80% Highlight plate; the border disc is 9.10:1 and 11.31:1.",
        "Built: React's lit Menu row didn't list .basalt-badge before; the notification centre's HighlightText override for its unread dot is gone, since the border disc follows.",
      ],
      tryIt: ["Move the pointer down the rows."],
      states: ["open-lit", "forced"],
      demo: () => <LitDemo />,
    },
    {
      id: "status-dots-elsewhere",
      name: "The nav dot and a checked radio item",
      intro: "The same defect outside status: both vanished in forced colours.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Decided 3 to 0: .basalt-nav-dot and .basalt-menu-radio-dot take the same border disc. The radio's dot was the only sign of which option was checked, unless that row was lit.",
        "A nav item is a link, so its dot is LinkText there; a menu row is text on Canvas, so its dot is CanvasText.",
      ],
      tryIt: [],
      states: ["forced-colours", "forced"],
      demo: () => <DotsDemo />,
    },
  ],
};
