// Round 16: X-style navigation, a sidebar and its collapsed rail. The council converged and the owner approved the drawing
// (decisions 42, 45, 48 and 49; navigation glyphs primary at rest, 55; the hover glide in navigation, 69 and 70); this is that
// design built as decided. The design panel has not reviewed this implementation.
//
// The states are real. "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads, and a
// state that ends in either takes the same emulation. "nav-hover" hovers the sidebar's second item, "nav-rail-hover" the rail's
// second, "nav-current-hover" the current item; "nav-focus" tabs to the first item; "nav-moving" hovers the first item, then the
// fourth, and holds the pill's transform 60ms into its 150ms move; "nav-fading" hovers a row, leaves the list, and holds the fade
// 40ms into its 100ms. The held frames are the real transition, paused, not a drawing.

import * as React from "react";

import {
  CalendarGlyph,
  HomeGlyph,
  Nav,
  NavGroup,
  NavItem,
  NotificationsGlyph,
  PolicyGlyph,
  RoutesGlyph,
  RunsGlyph,
  Segment,
  SegmentedControl,
  SandboxesGlyph,
  SettingsGlyph,
  TooltipProvider,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const TOKENS = ["fast", "base", "slow", "slower"] as const;

/** Slow motion for the walkthrough only: it multiplies the four duration tokens on the page by ten. The components don't know about it. */
function SlowMotion() {
  const [slow, setSlow] = React.useState("1");
  React.useEffect(() => {
    const root = document.documentElement;
    const originals = TOKENS.map((name) => {
      root.style.removeProperty(`--basalt-duration-${name}`);
      return [name, Number.parseFloat(getComputedStyle(root).getPropertyValue(`--basalt-duration-${name}`))] as const;
    });
    for (const [name, ms] of originals) {
      if (slow === "10" && Number.isFinite(ms)) root.style.setProperty(`--basalt-duration-${name}`, `${ms * 10}ms`);
    }
    return () => { for (const name of TOKENS) root.style.removeProperty(`--basalt-duration-${name}`); };
  }, [slow]);
  return (
    <div style={row}>
      <Caption>Speed</Caption>
      <SegmentedControl aria-label="Speed" value={slow} onValueChange={setSlow}>
        <Segment value="1">Normal</Segment>
        <Segment value="10">Slow ×10</Segment>
      </SegmentedControl>
    </div>
  );
}

const PAGES = [
  { id: "home", label: "Home", glyph: HomeGlyph },
  { id: "runs", label: "Runs", glyph: RunsGlyph },
  { id: "sandboxes", label: "Sandboxes", glyph: SandboxesGlyph },
  { id: "routes", label: "Routes", glyph: RoutesGlyph },
  { id: "policy", label: "Policy", glyph: PolicyGlyph },
] as const;

/** The sidebar and the rail, one current page between them: clicking an item makes it current in both. */
function NavDemo({ withGroups = false, density }: { withGroups?: boolean; density?: "compact" }) {
  const [current, setCurrent] = React.useState("home");
  const go = (id: string) => (event: React.MouseEvent) => { event.preventDefault(); setCurrent(id); };
  const items = (
    <>
      {PAGES.map((page) => (
        <NavItem key={page.id} href={`#${page.id}`} icon={page.glyph} current={current === page.id} onClick={go(page.id)} count={withGroups && page.id === "runs" ? 12 : undefined} dot={withGroups && page.id === "sandboxes" ? "New activity" : undefined}>{page.label}</NavItem>
      ))}
    </>
  );
  const account = (
    <>
      <NavItem href="#alerts" icon={NotificationsGlyph} current={current === "alerts"} onClick={go("alerts")}>Alerts</NavItem>
      <NavItem href="#calendar" icon={CalendarGlyph} current={current === "calendar"} onClick={go("calendar")}>Schedule</NavItem>
      <NavItem href="#settings" icon={SettingsGlyph} current={current === "settings"} onClick={go("settings")}>Settings</NavItem>
    </>
  );
  return (
    <TooltipProvider>
      <div data-density={density} style={{ display: "flex", gap: 48, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <Caption>Sidebar</Caption>
          <div style={{ width: 252 }}>
            <Nav aria-label="Blacksand">
              {withGroups ? <><NavGroup label="Workspace">{items}</NavGroup><NavGroup label="Account">{account}</NavGroup></> : <>{items}{account}</>}
            </Nav>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Caption>Collapsed rail</Caption>
          <div style={{ width: 72 }}>
            <Nav aria-label="Blacksand rail" collapsed>
              {withGroups ? <><NavGroup label="Workspace">{items}</NavGroup><NavGroup label="Account">{account}</NavGroup></> : <>{items}{account}</>}
            </Nav>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const ROUND_16: Round = {
  id: "16",
  title: "Navigation: the sidebar and the rail",
  reviewed: false,
  summary:
    "The council converged and the owner approved (decisions 42, 45, 48 and 49; navigation glyphs primary at rest, 55; the hover glide in navigation, 69 and 70): X's way. A 48px fully round pill hugs the glyph and the label; hover is that pill at the selected wash; the current page is the filled glyph and a 600 label with no background and no bar; the collapsed rail is a 48px circle; and one shared pill glides between hovered items. This is the approved drawing built; the design panel has not reviewed this implementation. A slow-motion control is on each step.",
  steps: [
    {
      id: "nav",
      name: "The sidebar and the rail",
      intro: "Nav, NavGroup and NavItem. The link is the whole row; the pill inside it hugs the glyph and the label.",
      decisions: [
        "Approved (the drawing in menus-final, section 1): the pill is 48 tall and fully round, 12 before the glyph and 20 after the label; the glyph is 24 and the label 20/28. Glyph and label are both primary at rest.",
        "Hover is the hugging pill at the selected wash (9% white, 7% black), never the column's width. Pressed is the same pill, and on touch the pill is the press.",
        "The current page is the glyph's selected form and the label at 600, with no background and no bar. The label reserves its 600 width, so nothing shifts when a page becomes current.",
        "The rail is a 48px circle with the label as the accessible name and a tooltip.",
        "Radius: foundations' \"full (avatars and dots only)\" gains the navigation hover pill.",
        "Open, for the panel and the owner: the count and the dot are the drawing's silence. A count is a number in secondary ink and a dot is a 6px dot in the label's ink, both drawn after the label; neither is drawn in the rail, where they are spoken with the name. Compact steps the pill to 40 (44 on touch).",
      ],
      tryIt: [
        "Hover the items: one pill follows the pointer and changes width to hug each.",
        "Click Runs: it becomes current in both the sidebar and the rail, and nothing shifts.",
        "Tab through the items: the glide hides and the focus ring shows around the pill. Move the pointer and the glide returns.",
        "Hover a rail circle for its tooltip.",
      ],
      states: ["nav-hover", "nav-current-hover", "nav-rail-hover", "nav-focus", "nav-hover-reduced-motion", "nav-hover-forced-colours"],
      demo: () => (
        <div style={col}>
          <SlowMotion />
          <NavDemo />
        </div>
      ),
    },
    {
      id: "glide",
      name: "The hover glide in navigation",
      intro: "One pill per list travels between items on duration-base with ease-out, and changes width to hug each.",
      decisions: [
        "Approved (decision 69): entering from outside it appears in place at once; moving between items it travels for 150ms, constant; leaving freezes a move in progress and the pill fades in place over duration-fast on ease-in; a return during the fade (the grace) travels from where the pill is.",
        "The first key hides the glide at once and the focus ring shows: the control ring at +2 around the hugging pill. The next pointer move brings the glide back, in place. As built, a hover resting under the pointer hides with the glide, so only the ring shows (the drawing does not say).",
        "Off on touch, under reduced motion and in forced colours. Each item paints its own pill then, in at once and out over duration-fast, which is also how it looks with no script. In forced colours the hovered item is Highlight on HighlightText, with no backplate.",
        "The pill is aria-hidden and pointer-inert, and no animation frame is in React state.",
        "Rows touch (2px above and below each pill), so a pointer crossing between items never lets the pill blink off.",
      ],
      tryIt: [
        "Sweep the pointer down the sidebar, then leave it mid-move: the pill stops and fades where it is.",
        "Leave and come back inside the fade: it travels from where it was.",
        "Press Tab, then move the pointer.",
        "Turn on Slow ×10 to watch the travel and the fade.",
      ],
      states: ["nav-moving", "nav-fading", "nav-hover-reduced-motion", "nav-hover-forced-colours"],
      demo: () => (
        <div style={col}>
          <SlowMotion />
          <NavDemo />
        </div>
      ),
    },
    {
      id: "groups",
      name: "Groups, counts and compact",
      intro: "Optional group labels, counts and dots, and compact density.",
      decisions: [
        "A group label is tertiary, 12/16 at 500, as in menus. In the rail it stays the group's accessible name and is not drawn.",
        "A count is a number and a dot is a small shape in the label's own ink; neither is ever a coloured disc. The dot's words are spoken with the item's name.",
        "Compact steps the pill down one step, to 40, and a touch row is at least 48 (a 44 pill) whatever the density.",
      ],
      tryIt: ["Hover Runs and Sandboxes: the pill grows to hug the count and the dot."],
      states: ["nav-compact"],
      demo: ({ state }) => (
        <div style={col}>
          <SlowMotion />
          <NavDemo withGroups density={state === "nav-compact" ? "compact" : undefined} />
        </div>
      ),
    },
  ],
};
