// Round 56: the app shell's gaps (cimip-gaps-2, batch B4): the capped, centred shell; a page with a pane; Nav at its second size; the header's primary
// kept under 720; and facts under the header's title. Decided and built by Opus on the no-council path (DECISIONS 226 and 265); the code review is Astra's
// and the pixels are the lead's. Every part is shown in two unlike domains with synthetic data: a support inbox and a build pipeline. A state's domain is
// its first word ("pipeline-…" is the build pipeline; anything else the inbox). "scrolled" scrolls the document so the pane is seen to stay; "pane-focus"
// gives the overflowing pane keyboard focus; "hover" is a real pointer on the item marked `data-wt-hover`. "reduced-motion" and "forced-colours" are
// emulations build.mjs sets before the page loads.

import { MoonIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  AppHeader,
  AppShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescriptionItem,
  DescriptionList,
  HomeGlyph,
  IconButton,
  InlineCode,
  Link,
  MessagesGlyph,
  Nav,
  NavGroup,
  NavItem,
  NotificationsGlyph,
  PaneLayout,
  PlanGlyph,
  ProfileGlyph,
  SettingsGlyph,
  SourcesGlyph,
  TabBar,
  TabBarItem,
  Text,
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
  return <div style={{ position: "relative", height: 620, overflow: "auto", transform: "translateZ(0)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>{children}</div>;
}

const mode = (state: string) => state.replace(/-(forced-colours|reduced-motion)$/, "");
const domainOf = (state: string) => (mode(state).startsWith("pipeline") ? "pipeline" : "inbox");

function useDemoState(state: string) {
  React.useEffect(() => {
    const m = mode(state);
    const timer = window.setTimeout(() => {
      if (m.endsWith("hover")) document.querySelectorAll(".basalt-nav[data-size=sm] .basalt-nav-item")[1]?.setAttribute("data-wt-hover", "");
      if (m.endsWith("scrolled")) window.scrollTo(0, 640);
      if (m.endsWith("pane-focus")) document.querySelector<HTMLElement>(".basalt-pane")?.focus({ focusVisible: true } as FocusOptions);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [state]);
}

const theme = () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light"; };
const toggle = <IconButton icon={MoonIcon} label="Switch theme" onClick={theme} />;

// ---- the two domains ----

const DOMAINS = {
  inbox: {
    brandLabel: "Helpdesk home",
    nav: [["Inbox", HomeGlyph, 14], ["Messages", MessagesGlyph, undefined], ["Reports", TrendsGlyph, undefined]] as const,
    secondaryLabel: "Saved views",
    secondary: [["Open and waiting", SourcesGlyph, 38], ["Assigned to me", ProfileGlyph, 12], ["Overdue", PlanGlyph, 3], ["Billing questions", NotificationsGlyph, undefined]] as const,
    title: "Ticket 2291: Refund for a double charge",
    facts: [<InlineCode key="r">#2291</InlineCode>, <Badge key="s" variant="plain" status="pending">Waiting on the customer</Badge>, <time key="t" dateTime="2026-11-22T09:12">Updated 12 min ago</time>],
    primary: "Reply",
    cards: [
      ["Customer wrote", "I was charged twice for the November plan. Can you refund one of them?"],
      ["Agent replied", "Thanks for flagging this. I can see both charges and have asked billing to refund the second."],
      ["Billing noted", "Refund queued for the second charge. It reaches the card in three to five days."],
      ["Customer wrote", "Thank you. Will I get an email when it goes through?"],
      ["Agent replied", "Yes, an email goes out once the card network confirms it."],
      ["Internal note", "Tag the account so the next renewal is checked before it bills."],
    ],
    pane: {
      label: "Ticket details",
      heading: "Ticket details",
      rows: [["Requester", "Sam Doe"], ["Plan", "Team, monthly"], ["Opened", "Nov 21, 4:02 PM"], ["Channel", "Email"], ["Priority", "Normal"], ["Tags", "billing, refund"]],
      more: ["Earlier tickets", "Ticket 2104: Invoice address", "Ticket 1988: Seat count", "Ticket 1770: Password reset", "Ticket 1512: Export to CSV", "Ticket 1301: Plan change", "Ticket 1188: Login code", "Ticket 1042: Card update", "Ticket 0977: Trial extension"],
    },
  },
  pipeline: {
    brandLabel: "Builds home",
    nav: [["Runs", HomeGlyph, undefined], ["Pipelines", SourcesGlyph, undefined], ["Settings", SettingsGlyph, undefined]] as const,
    secondaryLabel: "Pinned pipelines",
    secondary: [["web-app / main", PlanGlyph, undefined], ["api / release", PlanGlyph, 2], ["docs / preview", PlanGlyph, undefined], ["mobile / nightly", PlanGlyph, undefined]] as const,
    title: "Build 1284 on main",
    facts: [<InlineCode key="r">a81f3c2</InlineCode>, <Badge key="s" variant="plain" status="success">Passed</Badge>, <time key="t" dateTime="2026-11-22T08:40">Finished 4 min ago</time>],
    primary: "Run again",
    cards: [
      ["Install", "Dependencies restored from the cache in 18 seconds."],
      ["Lint", "Every file passed. The style sheet has no raw lengths."],
      ["Unit tests", "412 passed in 1 minute 9 seconds."],
      ["Browser tests", "96 passed in both themes, at 1440 and at 390."],
      ["Build", "The bundle is 182 KB, 3 KB under its limit."],
      ["Deploy preview", "The preview is live and its checks are green."],
    ],
    pane: {
      label: "Run details",
      heading: "Run details",
      rows: [["Trigger", "Push to main"], ["Commit", "a81f3c2"], ["Runner", "linux-large"], ["Duration", "6m 12s"], ["Cache", "Hit, 2.1 GB"], ["Artifacts", "3 files"]],
      more: ["Steps", "Check out the code", "Restore the cache", "Install", "Lint", "Unit tests", "Browser tests", "Build", "Upload artifacts", "Deploy preview"],
    },
  },
};

function Page({ domain }: { domain: keyof typeof DOMAINS }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {DOMAINS[domain].cards.map(([title, body], i) => (
        <Card key={i}><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{body}</CardDescription></CardHeader><CardContent>Synthetic sample content, so the page has something to scroll.</CardContent></Card>
      ))}
    </div>
  );
}

function Pane({ domain }: { domain: keyof typeof DOMAINS }) {
  const d = DOMAINS[domain].pane;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Text size="sm" weight="semibold">{d.heading}</Text>
        <DescriptionList form="stacked">{d.rows.map(([term, value]) => <DescriptionItem key={term} term={term}>{value}</DescriptionItem>)}</DescriptionList>
      </div>
      <div style={{ display: "grid", gap: 8, paddingTop: 20, borderTop: "1px solid var(--basalt-border-divider)" }}>
        <Text size="sm" weight="semibold">{d.more[0]}</Text>
        {d.more.slice(1).map((line) => <Link key={line} href={`#${line.replace(/\W+/g, "-").toLowerCase()}`}>{line}</Link>)}
      </div>
    </div>
  );
}

function Shell({ state, capped = false, pane = false, secondary = true, facts = true }: { state: string; capped?: boolean; pane?: boolean; secondary?: boolean; facts?: boolean }) {
  useDemoState(state);
  const domain = domainOf(state);
  const d = DOMAINS[domain];
  return (
    <Frame>
      <ToastProvider>
        <AppShell
          capped={capped}
          brand={lockup}
          brandMark={<Mark />}
          brandLabel={d.brandLabel}
          sidebar={
            <>
              <Nav aria-label="Primary">
                {d.nav.map(([label, icon, count], i) => <NavItem key={label} href={`#${label.toLowerCase()}`} icon={icon} current={i === 0} count={count}>{label}</NavItem>)}
              </Nav>
              {secondary ? (
                <Nav aria-label={d.secondaryLabel} size="sm">
                  <NavGroup label={d.secondaryLabel}>
                    {d.secondary.map(([label, icon, count], i) => <NavItem key={label} href={`#${label.replace(/\W+/g, "-").toLowerCase()}`} icon={icon} current={i === 0} count={count}>{label}</NavItem>)}
                  </NavGroup>
                </Nav>
              ) : null}
            </>
          }
          account={<Nav aria-label="Account"><NavItem href="#profile" icon={ProfileGlyph}>Profile</NavItem></Nav>}
          header={<AppHeader title={d.title} facts={facts ? d.facts : undefined} actions={<>{toggle}<Button variant="primary">{d.primary}</Button></>} />}
          tabBar={
            <TabBar>
              {d.nav.map(([label, icon], i) => <TabBarItem key={label} href={`#${label.toLowerCase()}`} icon={icon} current={i === 0}>{label}</TabBarItem>)}
            </TabBar>
          }
        >
          {pane ? <PaneLayout pane={<Pane domain={domain} />} paneLabel={d.pane.label}><Page domain={domain} /></PaneLayout> : <Page domain={domain} />}
        </AppShell>
      </ToastProvider>
    </Frame>
  );
}

const MEDIA = (base: string[]) => [...base, "forced-colours", "reduced-motion", "pipeline-forced-colours"];

export const ROUND_56: Round = {
  id: "56",
  title: "The app shell's gaps: a capped shell, a pane, a smaller Nav, the primary on a phone and facts under the title (cimip-gaps-2, B4)",
  reviewed: false,
  summary:
    "Five gaps CIMIP found in the app shell, built for any app: AppShell's capped form (the sidebar and the page centred together, at the sidebar plus the page's own 72rem), PaneLayout (a column beside the page that stays in view and scrolls inside, the sidebar's own pattern), Nav size=\"sm\" for a second list under the main one, the header's primary kept in the bar under 720 with its words, and a line of facts under the header's title. Decided and built by Opus on the no-council path (DECISIONS 226 and 265); Astra's code review and the lead's pixel check have not happened yet, and the design panel did not review it. Every part is shown in a support inbox and in a build pipeline, synthetic data only, in both themes, at 1440 (1920 for the cap) and 390, with forced colours and reduced motion.",
  steps: [
    {
      id: "app-shell",
      name: "The capped shell",
      intro: "AppShell capped: on a wide window the sidebar and the page are one centred block, so the space is shared by both sides instead of gathering at one.",
      widths: [1920, 1440, 390],
      scales: [1, 2],
      height: 800,
      decisions: [
        "The cap is --basalt-shell-width, derived from two tokens and not a new one: size-sidebar-width plus size-page-width (1408px at 16px text, and it grows with the reader's text size). At the cap the page is exactly its own 72rem cap, so the shell's cap and the page's meet with no gap; under it (1408 and down) the capped shell draws what the uncapped one does, pixel for pixel, and a test holds that at 1408, 1300, 1024, 900 and 390.",
        "In the capped form the page fills its column, so an app that sets --basalt-shell-width on the root for another cap (CIMIP's own is 100rem) widens the page with it, and Basalt stays out of its numbers.",
        "The header spans the content column, as it always has, so its line ends at the shell's end; the margins either side are the page. The skip link moves in with the brand. The default shell is unchanged: capped is opt-in.",
      ],
      tryIt: ["Widen the window past 1408: the whole shell centres; the sidebar stays beside the page.", "Narrow it under 1408: nothing differs from the uncapped shell."],
      states: MEDIA(["pipeline"]),
      demo: ({ state }) => <Shell state={state} capped secondary={false} facts={false} />,
    },
    {
      id: "pane",
      name: "A page with a pane",
      intro: "PaneLayout: a 256px column at the page's end that stays in view under the bar, has a height of its own and scrolls inside when it is taller. The document still scrolls the page.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Weighed against foundations' \"never an inner pane\" (DECISIONS 96, a council rule): kept, not reversed. The rule is that the page is never moved into a scroller of its own; the sidebar is already sticky at 100dvh and scrolls only its own overflow. The pane is that pattern for a page's side column, so the document is still what scrolls the page, and foundations now says so in plain words.",
        "256 wide (size-sidebar-width, whose role already names a page's own aside), the gutter between, sticky space-6 under the bar, at most the window less the bar and space-6 above and below; it scrolls inside only when taller (overscroll-behavior: contain), and while it overflows it is a tab stop so the keys can scroll it, with the control ring at +2.",
        "It answers its own width: beside the page from 920px (size-sidebar-width + size-gutter + size-breakpoint-container-lg), so the page beside it is never under 640; narrower (the sidebar's 1024 to about 1220, the rail, a phone) it follows the page in the flow with no height of its own. The page is first in the source, so reading order matches at every width. A region named by the app; level 0, no fill or rim: what it holds groups by space and a divider.",
      ],
      tryIt: ["Scroll the page: the pane stays under the bar.", "Tab into the pane and press Page Down: the pane scrolls, the page does not.", "Narrow the window: the pane moves under the page."],
      states: [...MEDIA(["pipeline", "scrolled@1440", "pipeline-scrolled@1440", "pane-focus@1440"])],
      demo: ({ state }) => <Shell state={state} pane secondary={false} facts={false} />,
    },
    {
      id: "nav-sm",
      name: "Nav at its second size",
      intro: "Nav size=\"sm\": a quieter list under the main navigation (saved views in the inbox, pinned pipelines in the build tool), a 32px pill at 13/18 with a 16 glyph.",
      widths: [1440, 900],
      scales: [1, 2],
      height: 760,
      decisions: [
        "The main Nav's every rule a step smaller: the hugging pill (32, control-md), its hover at the selected wash and the one shared glide, the current page as the selected glyph and a 600 label with its width reserved, the control ring at +2. 8 before the glyph, 12 after the label, 8 between; a count at 12/16 in secondary ink.",
        "Compact steps the pill to 28, touch keeps it at 44, and in the rail it is a 32 circle on the main list's centre line with its label as the name and tooltip.",
        "The small size is for a second list only: an app's own destinations stay at the main size.",
      ],
      tryIt: ["Hover the saved views: one pill glides between them, as in the main list.", "Narrow to the rail: the small list becomes 32px circles."],
      states: [...MEDIA(["pipeline", "hover@1440"]), "rail@900", "pipeline-rail@900"],
      demo: ({ state }) => <Shell state={state} facts={false} />,
    },
    {
      id: "header",
      name: "The header: facts under the title, and the primary on a phone",
      intro: "AppHeader facts: a line under the title (a reference, a status, a time). Under 720 the primary stays in the bar with its words.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "The facts are one line at 13/18 in secondary ink under the 18/26 title, joined by dots (DotLine: drawn as dots, read as commas) and cut with an ellipsis. Title and line are 44 together, centred in the 56px bar at every width, so the bar never grows. A status is a plain Badge with its status, so the word says it and the dot is never alone. The facts are not part of the h1.",
        "Under 720 the primary stays at the bar's end with its words, 44 tall and radius 8 like the bar's other buttons; the title is cut first, never the action. Not the tab bar (it is navigation) and not a sheet (it would hide the page's main action behind a second press). The site header moves its primary into the narrow menu because that menu exists; an app's bar has none. Foundations' line \"the primary leaves the bar under 720\" (DECISIONS 96, council) is replaced, and the old test now asserts the new rule.",
      ],
      tryIt: ["Narrow the window to a phone: the primary keeps its words and the title gives way.", "Read the facts with a screen reader: \"#2291, Waiting on the customer, Updated 12 min ago\"."],
      states: MEDIA(["pipeline"]),
      demo: ({ state }) => <Shell state={state} secondary={false} />,
    },
  ],
};
