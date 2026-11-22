// Round 56: notices and search (cimip-gaps-2, batch B7; DECISIONS 265, the no-council path). Built and decided by Opus inside foundations; the code
// review is Astra's and the pixels are the lead's. Every part in two unlike domains with synthetic data: a build pipeline and a support inbox for
// the notification center, and a shared handbook and a team chat for the search. States: the bell open in each domain, a group opened, the page form
// on a phone with the tab bar, the list in a sidebar with a current entry, and the search with results, a current passage, its first load (bones),
// a slow changed query (the last results kept, "Searching"), and no results; forced colours and reduced motion for each.

import * as React from "react";

import {
  Card,
  FilterResult,
  Heading,
  LoadingShape,
  markMatches,
  NotificationCenter,
  NotificationList,
  NotificationsGlyph,
  Refreshing,
  SearchField,
  SearchPassage,
  SearchPassages,
  standIn,
  TabBar,
  TabBarItem,
  Text,
  HomeGlyph,
  SearchGlyph,
  SettingsGlyph,
} from "../../packages/react/src/index";
import type { MatchRange, NotificationEntry, StandInVariant } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

// ---- Two domains for the notification center ----

const PIPELINE: NotificationEntry[] = [
  { id: "p1", title: "Waiting on you: approve release 4.2", description: "web, production", time: "4m", status: "pending", unread: true, href: "#release-4-2" },
  {
    id: "p2",
    title: "Ines, Tomas and Ruth commented on your change",
    description: "Add retries to the upload worker",
    time: "12m",
    entries: [
      { id: "p2a", title: "Ines Ortega commented", description: "Can we cap the retries at five?", time: "12m", unread: true, href: "#c1" },
      { id: "p2b", title: "Tomas Lindqvist commented", description: "Backoff looks right to me.", time: "20m", unread: true, href: "#c2" },
      { id: "p2c", title: "Ruth Achebe commented", description: "Please add a test for the timeout.", time: "31m", href: "#c3" },
    ],
  },
  { id: "p3", title: "Deploy finished", description: "api, staging", time: "1h", status: "success", unread: true, href: "#deploy" },
  { id: "p4", title: "Disk usage above 85%", description: "runner-07", time: "3h", status: "warning", href: "#runner" },
  { id: "p5", title: "Nightly build failed", description: "3 tests failing", time: "Yesterday", status: "danger", href: "#nightly" },
  { id: "p6", title: "In review: update the cache keys", description: "Requested by Ruth Achebe", time: "Yesterday", status: "pending", href: "#review" },
];

const INBOX: NotificationEntry[] = [
  { id: "i1", title: "Waiting on your reply: ticket 4821", description: "Refund for a duplicate charge", time: "2m", status: "pending", unread: true, href: "#t4821" },
  {
    id: "i2",
    title: "Mia, Arjun and Leo replied on tickets you follow",
    time: "9m",
    count: 5,
    entries: [
      { id: "i2a", title: "Mia Santos replied on 4810", description: "The customer confirmed the new address.", time: "9m", unread: true, href: "#t4810" },
      { id: "i2b", title: "Arjun Mehta replied on 4802", description: "Escalated to the billing queue.", time: "26m", unread: true, href: "#t4802" },
      { id: "i2c", title: "Leo Brandt replied on 4799", description: "Sent the replacement order.", time: "48m", href: "#t4799" },
    ],
  },
  { id: "i3", title: "Ticket 4790 was closed", description: "Password reset link expired", time: "1h", status: "success", href: "#t4790" },
  { id: "i4", title: "You were added to the Billing queue", time: "2h", href: "#billing" },
  { id: "i5", title: "In review: your article draft", description: "How to change a plan", time: "Yesterday", status: "pending", href: "#draft" },
];

const leaves = (entries: NotificationEntry[]) => entries.flatMap((e) => e.entries ?? [e]);
const readAll = (entries: NotificationEntry[]): NotificationEntry[] => entries.map((e) => ({ ...e, unread: false, entries: e.entries?.map((c) => ({ ...c, unread: false })) }));

/** Opens the first group once it is drawn (a real press on its row), for the states that show a group open. */
function useOpenGroup(on: boolean) {
  React.useEffect(() => {
    if (!on) return undefined;
    const timer = window.setTimeout(() => document.querySelector<HTMLButtonElement>(".basalt-notification[data-group]")?.click(), 120);
    return () => window.clearTimeout(timer);
  }, [on]);
}

function Bell({ state }: { state: string }) {
  const kind = kindOf(state);
  const inbox = kind.startsWith("inbox");
  const [entries, setEntries] = React.useState(inbox ? INBOX : PIPELINE);
  useOpenGroup(kind.endsWith("group"));
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "var(--basalt-space-3)", padding: "var(--basalt-space-4) var(--basalt-gutter)", borderBottom: "1px solid var(--basalt-border-divider)" }}>
      <Text size="sm" tone="secondary" style={{ marginInlineEnd: "auto" }}>{inbox ? "A support inbox" : "A build pipeline"}</Text>
      <NotificationCenter defaultOpen entries={entries} onMarkAllRead={() => setEntries(readAll(entries))} viewAllHref="#all" />
    </div>
  );
}

// ---- The page form, on a phone, and the list in a sidebar ----

function PhonePage({ state }: { state: string }) {
  const kind = kindOf(state);
  const inbox = kind.startsWith("inbox");
  const [entries, setEntries] = React.useState(inbox ? INBOX : PIPELINE);
  useOpenGroup(kind.endsWith("group"));
  const unread = leaves(entries).filter((e) => e.unread).length;
  if (kind === "sidebar") return <Sidebar />;
  return (
    <div style={{ padding: "var(--basalt-space-4) var(--basalt-gutter)", paddingBottom: "var(--basalt-bottom-offset, 96px)", maxWidth: 720 }}>
      <Heading level={1} size="xl" id="notices-title" style={{ marginBottom: "var(--basalt-space-2)" }}>Notifications</Heading>
      <NotificationList entries={entries} aria-labelledby="notices-title" onMarkAllRead={() => setEntries(readAll(entries))} />
      <TabBar>
        <TabBarItem href="#home" icon={HomeGlyph}>Home</TabBarItem>
        <TabBarItem href="#search" icon={SearchGlyph}>Search</TabBarItem>
        <TabBarItem href="#notifications" icon={NotificationsGlyph} current dot={unread > 0 ? `${unread} unread` : undefined}>Notifications</TabBarItem>
        <TabBarItem href="#settings" icon={SettingsGlyph}>Settings</TabBarItem>
      </TabBar>
    </div>
  );
}

const SIDEBAR: NotificationEntry[] = [
  { id: "s1", title: "Upload worker retries", description: "Ines Ortega · 3 comments", time: "12m", unread: true, href: "#s1" },
  { id: "s2", title: "Cache keys for the CDN", description: "Waiting on your review", time: "1h", status: "pending", current: true, href: "#s2" },
  { id: "s3", title: "Release 4.2", description: "Deployed to staging", time: "3h", status: "success", href: "#s3" },
  { id: "s4", title: "Nightly build", description: "3 tests failing", time: "Yesterday", status: "danger", href: "#s4" },
];

function Sidebar() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--basalt-space-8)", padding: "var(--basalt-space-6) var(--basalt-gutter)" }}>
      <aside>
        <Heading level={2} size="sm" id="mine" style={{ margin: "0 0 var(--basalt-space-1) var(--basalt-space-4-5, 18px)" }}>Your changes</Heading>
        <NotificationList head={false} entries={SIDEBAR} aria-labelledby="mine" />
      </aside>
      <main>
        <Heading level={1} size="xl">Cache keys for the CDN</Heading>
        <Text tone="secondary">The page for the current entry. The list in the sidebar has no head band, and its current entry is its title at 600.</Text>
      </main>
    </div>
  );
}

// ---- The search, in two domains ----

interface Hit { source: string; meta: string; text: string }
const HANDBOOK: { query: string; label: string; hits: Hit[] } = {
  query: "laptop",
  label: "Search the handbook",
  hits: [
    { source: "Your first week › Equipment", meta: "Section 2", text: "Your laptop arrives on your first morning. Someone from IT sets the laptop up with you, and you choose a password together." },
    { source: "Working remotely › Security", meta: "Section 5", text: "Lock your laptop whenever you step away, and never leave it in a car. A lost laptop is reported the same day." },
    { source: "Travel › What to pack", meta: "Section 7", text: "Bring the laptop charger and the travel adapter; the office keeps spares of neither." },
    { source: "Leaving › Returning equipment", meta: "Section 9", text: "Return the laptop, its charger and your badge on your last day. A courier can collect them if you work from home." },
  ],
};
const CHAT: { query: string; label: string; hits: Hit[] } = {
  query: "contrast",
  label: "Search this channel",
  hits: [
    { source: "Noor Haddad", meta: "2h ago", text: "Can we check the contrast on the muted labels before Friday? Two of them look faint on the dark theme." },
    { source: "Elif Kaya", meta: "Yesterday", text: "I measured them: 4.1 to 1 on the panel. We need 4.5, so the contrast fix is a step up in ink." },
    { source: "You", meta: "Mon", text: "Raised a ticket for the contrast checks, and linked the screenshots from the review." },
  ],
};

/** What a server's highlighter returns: every place the words were found. */
const rangesOf = (text: string, query: string): MatchRange[] => {
  const out: MatchRange[] = [];
  if (!query) return out;
  const lower = text.toLowerCase();
  for (let at = lower.indexOf(query); at >= 0; at = lower.indexOf(query, at + query.length)) out.push([at, at + query.length]);
  return out;
};

function Passages({ hits, query, current, label }: { hits: Hit[]; query: string; current?: number; label: string }) {
  return (
    <SearchPassages aria-label={label}>
      {hits.map((hit, i) => (
        <SearchPassage key={hit.source + i} source={hit.source} meta={hit.meta} current={current === i} onClick={() => {}}>
          {markMatches(hit.text, rangesOf(hit.text, query))}
        </SearchPassage>
      ))}
    </SearchPassages>
  );
}

const standInHits = (variant: StandInVariant): Hit[] =>
  [0, 1, 2].map((i) => ({ source: standIn(i * 3 + 1, 18, variant), meta: standIn(i * 3 + 2, 6, variant), text: standIn(i * 3 + 3, 110, variant) }));

function Search({ state }: { state: string }) {
  const kind = kindOf(state);
  const domain = kind.startsWith("chat") ? CHAT : HANDBOOK;
  const [query, setQuery] = React.useState(kind === "none" ? "keyboard tray" : domain.query);
  const loading = kind === "loading";
  const refreshing = kind === "refreshing";
  const none = kind === "none";
  const hits = none ? [] : domain.hits;
  const count = none ? "No passages match" : hits.length === 1 ? "1 passage" : `${hits.length} passages`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--basalt-space-8)", padding: "var(--basalt-space-6) var(--basalt-gutter)" }} className="wt-search-page">
      <div>
        <Heading level={1} size="xl">{domain === CHAT ? "#design" : "Team handbook"}</Heading>
        <Text tone="secondary">{domain === CHAT ? "A team chat: the search runs on the server, over the whole history, and returns passages." : "A shared document: the search runs on the server and returns passages with their matches."}</Text>
      </div>
      <Card style={{ padding: 0 }}>
        <div style={{ display: "grid", gap: "var(--basalt-space-2)", padding: "var(--basalt-space-3) var(--basalt-space-3) 0" }}>
          <SearchField label={domain.label} placeholder={domain.label} value={query} onValueChange={setQuery} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--basalt-space-2)", minHeight: 18, paddingInline: "var(--basalt-space-1-5)" }}>
            {loading ? <span /> : <FilterResult style={{ margin: 0, fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)", color: "var(--basalt-text-tertiary)" }}>{count}</FilterResult>}
            <Refreshing on={refreshing} label="Searching" />
          </div>
        </div>
        <LoadingShape loading={loading} refreshing={refreshing} label="Searching" shape={() => <Passages hits={standInHits(0)} query="" label={domain.label} />}>
          {() => (none
            ? <Text size="sm" tone="secondary" style={{ padding: "var(--basalt-space-3) var(--basalt-space-4-5, 18px) var(--basalt-space-4)" }}>Nothing in the handbook matches “keyboard tray”.</Text>
            : <Passages hits={hits} query={domain.query} current={kind.endsWith("current") ? 1 : undefined} label={`Results for ${domain.query}`} />)}
        </LoadingShape>
      </Card>
    </div>
  );
}

const ALSO = (list: string[]) => [...list, ...list.slice(0, 2).flatMap((s) => [`${s}-forced-colours`, `${s}-reduced-motion`])];

export const ROUND_56: Round = {
  id: "56",
  title: "Notices and search: the pending mark, grouped repeats, the page form and search with server results (cimip-gaps-2, B7)",
  reviewed: false,
  summary:
    "Five gaps from building CIMIP, made general (DECISIONS 265, no council): the notification center's pending mark (the empty ring of the toast's marks, no colour), grouped repeats with names and a count that open in place, a page form (`NotificationList`) for a phone's tab bar and for a sidebar, an in-page search whose passages come from a server (`SearchField`, `SearchPassages`, `SearchPassage`, `SearchMatch`, `markMatches`) and loads with `LoadingShape`, and the US names `NotificationCenter` and `NotificationCenterProps`. Decided and built by Opus; the code review is Astra's and has not happened yet, and the design panel did not review it. Synthetic data in four domains: a build pipeline, a support inbox, a shared handbook and a team chat.",
  steps: [
    {
      id: "bell",
      name: "The bell: pending and a group",
      intro: "The notification center in a build pipeline and in a support inbox. Each has entries waiting on the reader (pending), a group of repeats, and the toast's three marks.",
      decisions: [
        "Pending is the toast's ring with nothing in it: Phosphor's Circle at 16, the same drawing as CheckCircle and XCircle, in secondary ink. Waiting is not a warning, so it has no colour. Badge's 6px ring was the first choice, but in the 16px mark seat it sat 10px from the 6px unread dot as a second, hollow dot: it read as a read state. The title says it in words (\"Waiting on you: …\"); the mark is aria-hidden like every mark.",
        "A group is the app's: `entries` on an entry. Its row is a button (aria-expanded) with the app's title naming who and what, then the toast's count (\"×3\", spoken \", 3 times\") and the core chevron. The title is cut first; the count and the chevron always show. `count` covers a group the app holds more of than it lists (×5 with three listed).",
        "A group opens in place under its row on the reveal's track (0fr to 1fr over duration-slow, ease-out; at once under reduced motion), its entries indented by the dot's and the mark's seats, so their seats sit under the group's words. Focus stays on the row: its entries are the next tab stops. They join the hover glide.",
        "A group with no `unread` of its own is unread while any of its entries is; the bell counts the entries, so three unread mentions are \"3 unread\". Errors are never grouped, as the toast never groups them.",
      ],
      tryIt: [
        "Open the group: three comments open under it. Tab: focus goes from the group's row to its first comment.",
        "Mark all as read: the dots go, the titles step to secondary, and nothing moves, the group included.",
      ],
      states: ALSO(["inbox", "pipeline-group", "inbox-group"]),
      widths: [1440, 390],
      height: 720,
      touch: true,
      demo: ({ state }) => <Bell state={state} />,
    },
    {
      id: "page",
      name: "The page form: a tab bar's destination, and a sidebar",
      intro: "On a phone the bell does not fit the header beside the page's buttons. `NotificationList` is the center's entries in the page, which the tab bar links to; the same list without its head is a sidebar's list of entries.",
      decisions: [
        "A page, not a sheet: a tab bar's cells are links to pages (never a tablist or a button), so the destination is the app's own notifications page, the same page \"View all\" opens. The tab bar's cell is `TabBarItem` with `NotificationsGlyph` and its `dot` (\"3 unread\" is spoken; counts are never drawn). From 720 the app shows the bell in its header instead.",
        "The same rows, seats, groups and words as the popover, with no popover, no title (the page's heading names the list, by aria-labelledby) and no glide: each entry paints its own plate, the page's solid plate. No rim: a list in the page, not an object. Paging is the app's (`ListBand` under it).",
        "`head={false}` drops the count and \"Mark all as read\", for a list of entries in a sidebar; `current` marks the entry for the page on screen with aria-current and its title at 600 from 400 (one cut line, so nothing moves). This closes batch B6's \"entries outside the notification center\".",
      ],
      tryIt: ["On the phone, open the group, then Mark all as read: the tab bar's dot goes.", "In the sidebar, the current entry is the one at 600."],
      states: [...ALSO(["inbox", "pipeline-group"]), "sidebar@1440", "sidebar-forced-colours@1440"],
      widths: [390, 1440],
      height: 844,
      touch: true,
      demo: ({ state }) => <PhonePage state={state} />,
    },
    {
      id: "search",
      name: "Search in a panel, with results from a server",
      intro: "A search over one place (a handbook, a channel's history) that runs on the server and returns passages with the matched words marked. It is in the page or a panel; the site's search dialog is unchanged.",
      decisions: [
        "Composed, not a new dialog: `SearchField` (an Input with the core search glyph and one clear ×; the first Esc empties it, the next is the app's), the app's count line (`FilterResult`: drawn at once, spoken once it holds still), and `SearchPassages`, an ordered list of `SearchPassage`s, in a `LoadingShape`. `SearchDialog` and `SearchResults` stay the site search's: a fixed-height area of picture rows.",
        "A passage is a link or a button with the notification entry's row geometry: the source (who said it, or the section) in primary at 400, cut, with the meta at the head's end in tertiary, and the passage under it in secondary, wrapping. `current` is the passage shown beside the results: aria-current and the source at 600.",
        "A match is a `mark` in primary ink at 600 with no fill: monochrome, so the ink and the weight are the mark, never a highlighter colour. `markMatches(text, ranges)` draws a server's ranges (joined, clamped, any order) and never parses HTML.",
        "The first results load as bones in the list's own shape; a changed query keeps the last results on screen (`refreshing`) and shows \"Searching\" only after a second. No results is the app's sentence in the list's place.",
      ],
      tryIt: ["Type in the field: Esc empties it; the × does too.", "Hover a passage: the plate, and the meta lifts to secondary."],
      states: ["chat", "chat-current", "loading", "refreshing", "none", "chat-current-forced-colours", "loading-forced-colours", "chat-reduced-motion", "loading-reduced-motion"],
      widths: [1440, 390],
      height: 720,
      touch: true,
      demo: ({ state }) => <Search state={state} />,
    },
  ],
};
