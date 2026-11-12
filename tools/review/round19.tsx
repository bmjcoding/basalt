// Round 19: site structure. The council voted (decision 96, a three-member round: Opus 8.5, Sol 8.5, Grok 8) and handed the build
// to Sonnet: the site header and its narrow menu, the app shell (sidebar, rail, header) and the phone tab bar. This is that design
// built as decided. The design panel has not reviewed this implementation, and the owner has not approved it.
//
// The states are real. "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads, and a state
// that ends in either takes the same emulation. "name@1024" is shot at that one width. "hover" is a real pointer on the item the
// demo marks `data-wt-hover`; "focus" is real keyboard focus; "under" scrolls the page so content passes under the smoked bar;
// "press-menu" and "press-more" click the narrow menu's Menu and the tab bar's More; "press-menu-opening" holds the unroll 50ms
// in, the real transitions, paused; "inset" simulates a 34px home indicator (env() reads 0 on a desktop); "opaque" is the same bar
// without the layer. The mark is a generic placeholder: brand marks are the owner's.

import { MoonIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  AppHeader,
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CalendarGlyph,
  HomeGlyph,
  IconButton,
  MessagesGlyph,
  Nav,
  NavGroup,
  NavItem,
  NotificationsGlyph,
  PlanGlyph,
  ProfileGlyph,
  SettingsGlyph,
  SiteHeader,
  SourcesGlyph,
  TabBar,
  TabBarItem,
  TabBarMore,
  ToastProvider,
  TrendsGlyph,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const Mark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /></svg>
);
const lockup = <><Mark /><span>Placeholder</span></>;

/** The live walkthrough shows each demo in a frame, so fixed and sticky parts stay inside it; a screenshot shows the page itself. */
const framed = new URLSearchParams(location.search).get("shot") !== "1";
function Frame({ children }: { children: React.ReactNode }) {
  if (!framed) return <>{children}</>;
  return <div style={{ position: "relative", height: 560, overflow: "auto", transform: "translateZ(0)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>{children}</div>;
}

function useDemoState(mode: string) {
  React.useEffect(() => {
    const root = document.documentElement;
    if (mode === "inset") root.style.setProperty("--_inset-bottom-sim", "34px");
    const timer = window.setTimeout(() => {
      if (mode === "hover") document.querySelectorAll(".basalt-site-link, .basalt-app-sidebar .basalt-nav-item")[1]?.setAttribute("data-wt-hover", "");
      if (mode === "tab-hover") document.querySelectorAll(".basalt-tabbar-item")[1]?.setAttribute("data-wt-hover", "");
      if (mode === "focus") document.querySelectorAll<HTMLElement>(".basalt-site-link, .basalt-tabbar-item")[1]?.focus({ focusVisible: true } as FocusOptions);
      if (mode === "under") window.scrollTo(0, 220);
    }, 50);
    return () => { window.clearTimeout(timer); root.style.removeProperty("--_inset-bottom-sim"); };
  }, [mode]);
}

const theme = () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light"; };
const toggle = <IconButton icon={MoonIcon} label="Switch theme" onClick={theme} />;

const PAGE = [
  ["Records are kept for 30 days", "Older runs are archived and can be restored on request."],
  ["Sandbox is ready", "Its routes were published to iad1."],
  ["Near the quota", "You have used 90% of this month's minutes."],
  ["Build finished", "The run exited with code 0. The log has the last 200 lines."],
  ["Invite sent", "A teammate has been asked to join the workspace."],
  ["Key rotated", "Three sandboxes picked up the new key."],
];
function Page({ cards = PAGE.length }: { cards?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {PAGE.slice(0, cards).map(([title, body]) => (
        <Card key={title}><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{body}</CardDescription></CardHeader><CardContent>Synthetic sample content, so the bar has something to sit over.</CardContent></Card>
      ))}
    </div>
  );
}

// ---- 1. the site header and its narrow menu

function SiteDemo({ state }: { state: string }) {
  const mode = state.replace(/-(forced-colours|reduced-motion)$/, "");
  useDemoState(mode.startsWith("press-") ? "default" : mode);
  const current = "Docs";
  return (
    <Frame>
      <SiteHeader
        brand={lockup}
        brandLabel="Placeholder home"
        links={["Product", "Docs", "Changelog", "Pricing", "About"].map((label) => ({ href: `#${label.toLowerCase()}`, label, current: label === current }))}
        themeToggle={toggle}
        action={<Button variant="primary">Get started</Button>}
        solid={mode === "opaque"}
      />
      <main style={{ maxWidth: 1152, margin: "0 auto", padding: "24px var(--basalt-space-4)" }}><Page /></main>
    </Frame>
  );
}

// ---- 2 and 3. the app shell and the phone tab bar

function ShellDemo({ state }: { state: string }) {
  const mode = state.replace(/-(forced-colours|reduced-motion)$/, "");
  useDemoState(mode.startsWith("press-") || mode === "current-more" ? "default" : mode);
  const more = /more/.test(mode);
  const current = mode === "current-more" ? "settings" : "home";
  return (
    <Frame>
      <ToastProvider>
        <AppShell
          brand={lockup}
          brandMark={<Mark />}
          brandLabel="Placeholder home"
          sidebar={
            <Nav aria-label="Primary">
              <NavItem href="#home" icon={HomeGlyph} current={current === "home"}>Home</NavItem>
              <NavItem href="#messages" icon={MessagesGlyph} dot="New activity">Messages</NavItem>
              <NavItem href="#notifications" icon={NotificationsGlyph} count={3}>Notifications</NavItem>
              <NavGroup label="Workspace">
                <NavItem href="#trends" icon={TrendsGlyph}>Trends</NavItem>
                <NavItem href="#plan" icon={PlanGlyph}>Plan</NavItem>
                <NavItem href="#sources" icon={SourcesGlyph}>Sources</NavItem>
              </NavGroup>
            </Nav>
          }
          account={
            <Nav aria-label="Account">
              <NavItem href="#settings" icon={SettingsGlyph} current={current === "settings"}>Settings</NavItem>
              <NavItem href="#profile" icon={ProfileGlyph}>Profile</NavItem>
            </Nav>
          }
          header={<AppHeader title={current === "settings" ? "Settings" : "Home"} solid={mode === "opaque"} actions={<>{toggle}<Button variant="primary">New entry</Button></>} />}
          tabBar={
            <TabBar>
              <TabBarItem href="#home" icon={HomeGlyph} current={current === "home"}>Home</TabBarItem>
              <TabBarItem href="#messages" icon={MessagesGlyph} dot="New activity">Messages</TabBarItem>
              <TabBarItem href="#trends" icon={TrendsGlyph}>Trends</TabBarItem>
              <TabBarItem href="#plan" icon={PlanGlyph}>Plan</TabBarItem>
              {more ? (
                <TabBarMore current={current === "settings" ? "Settings" : undefined}>
                  <NavItem href="#sources" icon={SourcesGlyph}>Sources</NavItem>
                  <NavItem href="#calendar" icon={CalendarGlyph}>Calendar</NavItem>
                  <NavItem href="#settings" icon={SettingsGlyph} current={current === "settings"}>Settings</NavItem>
                </TabBarMore>
              ) : <TabBarItem href="#sources" icon={SourcesGlyph}>Sources</TabBarItem>}
            </TabBar>
          }
        >
          {/* Short, so a whole-page screenshot is one screen and the fixed tab bar sits at its foot; "under" is long enough to scroll. */}
          <Page cards={mode === "under" ? PAGE.length : 2} />
        </AppShell>
      </ToastProvider>
      {mode === "inset" ? <div aria-hidden="true" style={{ position: "fixed", left: "50%", bottom: 8, width: 134, height: 5, transform: "translateX(-50%)", borderRadius: 3, background: "var(--basalt-text-primary)", zIndex: 1000 }} /> : null}
    </Frame>
  );
}

const SITE_STATES = [
  "hover@1440", "focus@1440", "under@1440", "under@390", "press-menu-opening@390", "press-menu@390", "opaque",
  "reduced-motion", "forced-colours", "hover-forced-colours@1440", "press-menu-forced-colours@390", "press-menu-reduced-motion@390",
];
const SHELL_STATES = [
  "edge@1024", "rail@1023", "rail@900", "hover@1440", "under@1440", "opaque", "reduced-motion", "forced-colours", "hover-forced-colours@1440", "rail-forced-colours@900",
];
const TAB_STATES = [
  "tab-hover@390", "focus@390", "press-more@390", "current-more@390", "inset@390", "press-more-forced-colours@390", "forced-colours@390", "reduced-motion@390", "press-more-reduced-motion@390",
];

export const ROUND_19: Round = {
  id: "19",
  title: "Site structure: the site header, the app shell and the phone tab bar",
  reviewed: false,
  summary:
    "The council voted (decision 96, a three-member round, 2 of 3 deciding) and handed the build over. The site header is the shipped smoked bar at 56px with Nav's language for its links; under 720 it becomes a Menu button that opens a new top sheet. The app shell is a 256px sidebar, a 72px rail from 720 to 1023 and, under 720, a solid phone tab bar; the document scrolls. This is the decided design built; the design panel has not reviewed this implementation, and no brand mark is real (a placeholder stands in).",
  steps: [
    {
      id: "site-header",
      name: "The site header and its narrow menu",
      intro: "The brand, the links beside it, a spacer, then the actions. Under 720 the links and the action go into a menu that unrolls from the bar.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "The bar is the shipped basalt-chrome at 56px, border box, its hairline inside, at every width. The top safe area is padding above it; the sticky offset and scroll-padding-top add it. Its inline padding is the gutter (24, and 16 under 720) or the side inset, whichever is larger, and the row is 72rem wide.",
        "Links are 14/20 at 400 in secondary ink on a 32px hugging pill; the hit area is 44 tall at every pointer, 2px either side of the pill, so neighbours touch (2 to 1; Grok kept 32 and made 44 coarse only). Hover is the selected wash with the ink to primary, and one shared pill glides with Nav's rules (2 to 1; Grok: each link paints its own).",
        "The current page is primary at 600 with its 600 width reserved: no background, underline or bar. Focus is the control ring at +2 round the pill. In forced colours the current page keeps its 600 and hover is Highlight.",
        "The actions are the theme toggle and at most one primary Button, never a danger Button. The links must fit at 720 beside the brand and the actions: five at most, and the rest go in the footer.",
        "Under 720 the buttons are 44, radius 8. Menu is a ghost icon button with the core Menu glyph at IconButton's own 16 (Opus and Grok; Sol wanted 20) and morphs to Close over duration-slow.",
        "The menu is Sheet side=\"top\" on Base UI's Dialog: a real focus trap, an inert page, Escape and focus return (Opus's prototype used a native dialog, where Tab leaves for the browser). Its first row redraws the bar in place with Close on the Menu button's exact box; the list unrolls beneath it over duration-slower on ease-out and leaves at 0.75 on ease-in; opacity only under reduced motion.",
        "Rows are Nav rows without a glyph (the 48px pill at 20/28, the current row at 600). The bar's one action sits at the foot, full width. Focus lands on Close; widening past 720 closes the menu and focuses the current link.",
        "Opaque form: the same bar on surface-page with no blur, for a product whose content does not scroll under it. Whether DECISIONS 1's N1 chrome covers N1's sticky header is the owner's open question; until he answers, N1's header is solid.",
      ],
      tryIt: [
        "Hover the links: one pill glides between them. Press a key and it hides; the ring shows.",
        "Narrow the window under 720: the links go, Menu stays. Open it, Tab round it, press Escape.",
        "Widen the window with the menu open: it closes and focus goes to the current link.",
      ],
      states: SITE_STATES,
      demo: ({ state }) => <SiteDemo state={state} />,
    },
    {
      id: "app-shell",
      name: "The app shell: sidebar, rail and header",
      intro: "A 256px sidebar from 1024, a 72px rail from 720 to 1023, and one header over the content column. The document scrolls.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 800,
      decisions: [
        "The sidebar is 256 (2 to 1; Grok: 240) on surface-page, edged by a 1px border-divider, sticky at 100dvh and scrolling its own list only when Nav overflows. Its brand band is the header's 56 and draws no line; the header's line ends at the sidebar's edge. The edge is structure, and foundations lists it beside the pinned column's divider.",
        "The sidebar becomes the 72px rail below 1024 (2 to 1; Grok: below 1280): Nav's collapsed form, the label as name and tooltip, counts spoken, no collapse toggle. Under 720 there is no sidebar and no rail.",
        "The document is the scroller, never an inner pane, and pages set scrollbar-gutter: stable. The header spans the content column only; its title is 18/26 at 600 (2 to 1; Grok: 14/20), then the actions at its end. On a phone it spans the full width with the same geometry.",
        "Open for the build: the brief's round list says 1024 and 900 are the rail, but its shell rule says 1024 and up is the sidebar. The shell follows the rule, so this round shows 1024 as the sidebar's low edge, 1023 and 900 as the rail.",
      ],
      tryIt: ["Scroll the page: the sidebar stays and the header sticks.", "Resize across 1024 and 720: sidebar, rail, then the tab bar."],
      states: SHELL_STATES,
      demo: ({ state }) => <ShellDemo state={state} />,
    },
    {
      id: "tab-bar",
      name: "The phone tab bar",
      intro: "Three to five destinations under 720, always glyph over label; more than five is four, then More.",
      widths: [390],
      scales: [1, 2],
      height: 800,
      decisions: [
        "Solid surface-page for every product with a hairline on top, no shadow and no blur; Canvas with a CanvasText line in forced colours; not in print. 56 with the hairline inside, plus the bottom safe area and the side insets. Content pads past it and toasts sit above it.",
        "Cells are links in a nav named Primary with aria-current, not a tablist. A 24 glyph over a 12/16 label, primary at rest, the label at 400; the current one is the selected glyph and the label at 600, with no wash, pill or bar.",
        "Press and hover are a 32px circle at the selected wash behind the glyph (2 to 1; Opus: a 48 x 32 capsule), and the first key hides it. Focus is the control ring inset by its own width on the full cell (2 to 1; Opus: the ring at +2 round the capsule).",
        "A new-activity mark is a 6px dot in the label's ink at the glyph's top end; its words are in the link's name. Counts are spoken, not drawn.",
        "More than five: four, then More, a button that opens the bottom Sheet with the rest as Nav rows. More takes the current look while one of its pages is current, and its name says which.",
      ],
      tryIt: ["Press More: the rest are Nav rows in a bottom sheet.", "Tab to a cell: the ring is inset on the full cell. Press a key and hover shows no circle."],
      states: TAB_STATES,
      demo: ({ state }) => <ShellDemo state={state} />,
    },
  ],
};
