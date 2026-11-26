// Round 79: cimip-gaps-3 topic T5, built from the council's decision (DECISIONS 385: the owner's handoff; DECISIONS 393: his choice of the scoped touch
// exception): the shell, the page frame and the stream. The app page's rhythm and ladder, AppHeader's title on a phone, the short window, the rail at every
// width, the wide record sheet, the account under a site header, the lockup and the footnote, MessagePage, StatusBar pinned, the stream's quiet actions and
// the time as a link, ConnectionBar, the tray's hold, order and first line, and Callout's meta. Built by Opus; the implementation has not been reviewed; the
// browser tests are written and not run (DECISIONS 359).
//
// Four results are for the owner's eye, each before and after: the phone tray's order, the connection bar moving the page by its height, the stream on
// touch (More and the time link 44 wide, 32 tall in a head and 24 in a joined entry), and the page title in the page under 720. Each "today" side is this
// build with the change taken back, scoped to that side.

import * as React from "react";

import {
  AppBrand,
  AppFootnote,
  AppHeader,
  AppPage,
  AppPageHead,
  AppSection,
  AppSectionHead,
  AppSections,
  AppShell,
  Avatar,
  Badge,
  Button,
  Callout,
  Cluster,
  ConnectionBar,
  CopyGlyph,
  HomeGlyph,
  IconButton,
  Input,
  MessagePage,
  Nav,
  NavGroup,
  NavItem,
  Presence,
  ProfileGlyph,
  SearchGlyph,
  SettingsGlyph,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SiteFooter,
  SiteHeader,
  SitePage,
  StatusBar,
  Stream,
  StreamMessage,
  StreamNote,
  StreamQuote,
  TabBar,
  TabBarItem,
  TabBarMore,
  Tray,
  TrayRow,
} from "../../packages/react/src/index";
import type { ConnectionStatus } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const NOT_REVIEWED = "Built from the council's T5 decision (DECISIONS 385, and the owner's DECISIONS 393 for the touch exception); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";
const mode = (state: string) => state.replace(/-(forced-colours|reduced-motion)$/, "");
const bakery = (state: string) => mode(state).includes("bakery");

/** The live walkthrough shows each demo in a frame, so fixed and sticky parts stay inside it; a screenshot shows the page itself. */
const framed = new URLSearchParams(location.search).get("shot") !== "1";
function Frame({ children, height = 620 }: { children: React.ReactNode; height?: number }) {
  if (!framed) return <>{children}</>;
  return <div style={{ position: "relative", height, overflow: "auto", transform: "translateZ(0)", border: "1px solid var(--basalt-border-divider)", borderRadius: 12 }}>{children}</div>;
}

/** A synthetic mark: a square with a wave (the gauge) or a loaf (the bakery). */
function Mark({ size = 32, loaf = false }: { size?: number; loaf?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
      {loaf ? <path d="M8 20c0-5 4-8 8-8s8 3 8 8v3H8z" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="M6 18c3-4 6 4 10 0s7 4 10 0" fill="none" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

const D = {
  gauge: { brand: "Harbour gauge", sub: "North breakwater", title: "Outer harbour gauge, north breakwater", facts: ["Gauge 14", "Updated 2 min ago"], nav: ["Readings", "Alerts", "Sensors", "Logs", "Settings", "Archive"] },
  bakery: { brand: "Corner bakery", sub: "Morning shift", title: "Wholesale orders for the Thursday morning run", facts: ["Route 3", "42 orders"], nav: ["Orders", "Stock", "Proofing", "Ovens", "Staff", "Reports"] },
};
const GLYPHS = [HomeGlyph, SearchGlyph, SettingsGlyph, ProfileGlyph, HomeGlyph, SearchGlyph];

function useScroll(state: string, y: number) {
  React.useEffect(() => {
    if (!/echo|scrolled/.test(state)) return undefined;
    const timer = window.setTimeout(() => window.scrollTo(0, y), 60);
    return () => window.clearTimeout(timer);
  }, [state, y]);
}

function Shell({ state, children, header, banner, foot, rail = false, capped = false, footnote = false, tabBar = true }: { state: string; children: React.ReactNode; header?: React.ReactNode; banner?: React.ReactNode; foot?: React.ReactNode; rail?: boolean; capped?: boolean; footnote?: boolean; tabBar?: boolean }) {
  const d = bakery(state) ? D.bakery : D.gauge;
  return (
    <AppShell
      rail={rail}
      capped={capped}
      brand={<AppBrand mark={<Mark size={36} loaf={bakery(state)} />} title={d.brand} subtitle={d.sub} />}
      brandLabel={`${d.brand} home`}
      sidebar={<Nav aria-label="Primary"><NavGroup label="Work">{d.nav.slice(0, 4).map((label, i) => <NavItem key={label} href={`#${label.toLowerCase()}`} icon={GLYPHS[i] ?? HomeGlyph} current={i === 0}>{label}</NavItem>)}</NavGroup></Nav>}
      account={<Nav aria-label="Account"><NavItem href="#profile" icon={ProfileGlyph}>Profile</NavItem></Nav>}
      footnote={footnote ? <AppFootnote detail="Since 06:00" action={<Button size="sm" variant="ghost" edge="end">Switch</Button>} railTrigger={<IconButton icon={ProfileGlyph} label="Shift: Night, since 06:00" />}>{bakery(state) ? "Morning shift" : "Night shift"}</AppFootnote> : undefined}
      version={<a className="basalt-link" href="#v">Version 2.4</a>}
      header={header ?? <AppHeader title={d.title} facts={d.facts} />}
      banner={banner}
      foot={foot}
      tabBar={tabBar ? (
        <TabBar>
          {d.nav.slice(0, 4).map((label, i) => <TabBarItem key={label} href={`#${label.toLowerCase()}`} icon={GLYPHS[i] ?? HomeGlyph} current={i === 0}>{label}</TabBarItem>)}
          <TabBarMore before={<Button>Pause animations</Button>}>{d.nav.slice(4).map((label) => <NavItem key={label} href={`#${label.toLowerCase()}`} icon={SettingsGlyph}>{label}</NavItem>)}</TabBarMore>
        </TabBar>
      ) : undefined}
    >
      {children}
    </AppShell>
  );
}

function Sections({ state }: { state: string }) {
  if (bakery(state)) {
    return (
      <AppSections>
        <AppSection>
          <AppSectionHead title="Today's bake" description="What goes in the ovens before the 5:30 van." actions={<Cluster><Button size="sm">Print list</Button><Button size="sm">Add batch</Button><Button size="sm" variant="ghost" edge="end">Edit</Button></Cluster>} />
          <p style={{ margin: 0 }}>Rye, 24 loaves. Sourdough, 40 loaves. Seeded rolls, 120.</p>
        </AppSection>
        <AppSection>
          <AppSectionHead title="Proofing" />
          <AppSections>
            <AppSection><AppSectionHead title="Cabinet 1" description="Set to 27 °C." actions={<Button size="sm">Open log</Button>} /><p style={{ margin: 0 }}>Rye, 2 h 10 min left.</p></AppSection>
            <AppSection><AppSectionHead title="Cabinet 2" /><p style={{ margin: 0 }}>Empty.</p></AppSection>
          </AppSections>
        </AppSection>
      </AppSections>
    );
  }
  return (
    <AppSections>
      <AppSection>
        <AppSectionHead title="Tides" description="High and low water at the outer gauge, against the forecast." actions={<><Button size="sm">Export</Button><Button size="sm">Compare</Button><Button size="sm" variant="ghost" edge="end">Settings</Button></>} />
        <p style={{ margin: 0 }}>High water 06:10, 6.1 m. Low water 12:24, 0.8 m.</p>
      </AppSection>
      <AppSection>
        <AppSectionHead title="Sensors" description="Each probe on the breakwater." />
        <AppSections>
          <AppSection><AppSectionHead title="Probe A" actions={<Button size="sm">Calibrate</Button>} /><p style={{ margin: 0 }}>Reading normally.</p></AppSection>
          <AppSection><AppSectionHead title="Probe B" /><p style={{ margin: 0 }}>0.2 m low since 04:00.</p></AppSection>
        </AppSections>
      </AppSection>
    </AppSections>
  );
}

// ---- 1. Rhythm
function Rhythm({ state }: { state: string }) {
  return <Frame><Shell state={state}><Sections state={state} /></Shell></Frame>;
}

// ---- 2. The phone title
function PhoneTitle({ state }: { state: string }) {
  const d = bakery(state) ? D.bakery : D.gauge;
  const before = mode(state).startsWith("before");
  useScroll(state, 220);
  return (
    <Frame>
      <Shell state={state} header={<AppHeader title={d.title} facts={d.facts} phoneTitle={before ? "bar" : "page"} actions={<IconButton icon={SearchGlyph} label="Search" edge="end" />} />}>
        {before ? null : <AppPageHead phoneOnly title={d.title} facts={d.facts} />}
        <Sections state={state} />
        <div style={{ height: 900 }} />
      </Shell>
    </Frame>
  );
}

// ---- 3. The short window
function Short({ state }: { state: string }) {
  return (
    <Frame>
      <Shell state={state} banner={<ConnectionBar status="offline" detail="Readings are kept on this device." action={<Button size="sm" variant="ghost">Retry</Button>} />} foot={<Input aria-label="Add a note" placeholder="Add a note" />}>
        <Sections state={state} />
        <div style={{ height: 600 }} />
      </Shell>
    </Frame>
  );
}

// ---- 4. The rail at every width
function Rail({ state }: { state: string }) {
  return <Frame><Shell state={state} rail capped footnote><Sections state={state} /></Shell></Frame>;
}

// ---- 5. The wide sheet
function WideSheet({ state }: { state: string }) {
  const wide = mode(state) !== "standard";
  return (
    <Sheet defaultOpen={mode(state) !== "default"}>
      <SheetTrigger>Open order 1042</SheetTrigger>
      <SheetContent size={wide ? "wide" : "default"}>
        <SheetHeader closeLabel="Close">
          <SheetTitle>{bakery(state) ? "Order 1042, Harbour Café" : "Probe B, north breakwater"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <AppSections>
            <AppSection><AppSectionHead level={3} title="Lines" /><p style={{ margin: 0 }}>Rye, 6 loaves. Seeded rolls, 24. Croissants, 30.</p></AppSection>
            <AppSection><AppSectionHead level={3} title="Delivery" /><p style={{ margin: 0 }}>Van 2, by 6:15. Leave at the back door.</p></AppSection>
          </AppSections>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ---- 6. The account under a site header
function Account({ state }: { state: string }) {
  const d = bakery(state) ? D.bakery : D.gauge;
  const links = mode(state).includes("nolinks") ? [] : [{ href: "#orders", label: d.nav[0]!, current: true }, { href: "#stock", label: d.nav[1]! }];
  return (
    <Frame>
      <SitePage>
        <SiteHeader brand={<AppBrand mark={<Mark size={32} loaf={bakery(state)} />} title={d.brand} />} brandLabel={`${d.brand} home`} links={links} account={<Button variant="ghost" edge="end">Dana Okafor</Button>} />
        <AppPage>
          <AppPageHead title={d.title} facts={d.facts} actions={<Button size="sm">New</Button>} />
          <Sections state={state} />
        </AppPage>
        <SiteFooter legal="Synthetic data for a review." />
      </SitePage>
    </Frame>
  );
}

// ---- 7. The lockup and the footnote
function Brand({ state }: { state: string }) {
  return <Frame><Shell state={state} footnote><Sections state={state} /></Shell></Frame>;
}

// ---- 8. A page before the app
function Message({ state }: { state: string }) {
  return bakery(state) ? (
    <MessagePage brand={<AppBrand mark={<Mark size={32} loaf />} title="Corner bakery" />} title="The ovens are being serviced" description="Orders open again at 4:00. Anything you placed before 2:00 is kept." actions={<><Button variant="primary">See your orders</Button><Button variant="ghost">Call the bakery</Button></>} />
  ) : (
    <MessagePage brand={<AppBrand mark={<Mark size={32} />} title="Harbour gauge" />} title="This link has expired" description="Ask the harbour office for a new one. Links last a day." actions={<Button variant="primary">Sign in</Button>}>
      <Callout title="Still on the breakwater?" status="info">Readings on this device are kept until you sign in.</Callout>
    </MessagePage>
  );
}

// ---- 9. StatusBar pinned
function Pinned({ state }: { state: string }) {
  const d = bakery(state) ? D.bakery : D.gauge;
  return (
    <Frame>
      <SitePage>
        <SiteHeader brand={<AppBrand mark={<Mark size={32} loaf={bakery(state)} />} title={d.brand} />} brandLabel={`${d.brand} home`} />
        <AppPage><AppPageHead title={d.title} /><p style={{ margin: 0 }}>A short page: the bar rests at the column's foot.</p></AppPage>
        <StatusBar pinned start={<Button size="sm" variant="ghost">{bakery(state) ? "Route 3" : "Gauge 14"}</Button>} message={{ text: bakery(state) ? "Order 1042 saved" : "Reading logged" }} end={<Button size="sm" variant="ghost">Help</Button>} />
      </SitePage>
    </Frame>
  );
}

// ---- 10. The stream
function Quiet() {
  return <IconButton size="xs" variant="ghost" icon={CopyGlyph} label="Copy a link to this message" />;
}
function StreamDemo({ state }: { state: string }) {
  const before = mode(state) === "before";
  const q = before ? undefined : <Quiet />;
  const href = (id: string) => (before ? undefined : `#${id}`);
  React.useEffect(() => {
    if (!mode(state).startsWith("more")) return undefined;
    const timer = window.setTimeout(() => document.querySelector<HTMLButtonElement>("#m2 .basalt-stream-more")?.click(), 80);
    return () => window.clearTimeout(timer);
  }, [state]);
  const hover = mode(state) === "hover" ? { "data-wt-force": "hover" } : {};
  return bakery(state) ? (
    <Stream label="Order notes" style={{ maxWidth: 640 }}>
      <StreamMessage id="m1" author="Ana Ruiz" time="05:02" timeHref={href("m1")} quietActions={q} actions={<Badge status="success">Done</Badge>}><p>Rye is out: 24 loaves, two a little dark at the back of oven 3.</p></StreamMessage>
      <StreamMessage id="m2" joined author="Ana Ruiz" time="05:03" timeHref={href("m2")} quietActions={q} {...hover}><p>Moving the <a className="basalt-link" href="#rolls">seeded rolls</a> to oven 2 so they finish by the van.</p></StreamMessage>
      <StreamMessage id="m3" joined author="Ana Ruiz" time="05:03" timeHref={href("m3")} quietActions={q}><p>Done.</p></StreamMessage>
      <StreamNote time="05:10">Order 1042 marked ready</StreamNote>
      <StreamMessage id="m4" author="Sam Okoro" time="05:12" timeHref={href("m4")} quietActions={q}><StreamQuote cite="Ana Ruiz said" time="05:03">Moving the seeded rolls to oven 2.</StreamQuote><p>Thanks, I will load the van from the left.</p></StreamMessage>
    </Stream>
  ) : (
    <Stream label="Shift notes" style={{ maxWidth: 640 }}>
      <StreamMessage id="m1" author="Dana Okafor" time="06:10" timeHref={href("m1")} quietActions={q} meta={<Presence status="active" />}><p>High water at <a className="basalt-link" href="#tide">6.1 m</a> on the outer gauge, as forecast.</p></StreamMessage>
      <StreamMessage id="m2" joined author="Dana Okafor" time="06:11" timeHref={href("m2")} quietActions={q} {...hover}><p>Probe B reads <a className="basalt-link" href="#b">0.2 m low</a> again; a long sentence that wraps past the seat at the end of its first line.</p></StreamMessage>
      <StreamMessage id="m3" joined author="Dana Okafor" time="06:12" timeHref={href("m3")} quietActions={q}><p>Logged.</p></StreamMessage>
      <StreamNote time="06:20">Probe B set to calibrate</StreamNote>
      <StreamMessage id="m4" author="Lee Marsh" time="06:31" timeHref={href("m4")} quietActions={q} actions={<Button size="sm" variant="ghost">Stop</Button>}><p>Calibration started; it takes ten minutes.</p></StreamMessage>
    </Stream>
  );
}

// ---- 11. The connection bar
function Connection({ state }: { state: string }) {
  const m = mode(state).replace(/-?bakery$/, "") || "default";
  const wanted: ConnectionStatus | "restored" | "none" = m === "default" ? "offline" : m === "before" ? "none" : (m as ConnectionStatus | "restored");
  // The bar draws Reconnecting at once when it is already drawn, and Back online after an outage it drew: the demo starts offline, then moves.
  const [status, setStatus] = React.useState<ConnectionStatus>(wanted === "none" || wanted === "restored" || wanted === "reconnecting" ? (wanted === "none" ? "connected" : "offline") : wanted);
  React.useEffect(() => {
    if (wanted === "restored") setStatus("connected");
    if (wanted === "reconnecting") setStatus("reconnecting");
  }, [wanted]);
  const since = React.useMemo(() => Date.now() - 6 * 60_000, []);
  return (
    <Frame>
      <Shell state={state} banner={<ConnectionBar status={status} since={since} detail={bakery(state) ? "New orders wait on this tablet." : "Readings are kept on this device."} action={<Button size="sm" variant="ghost">Retry</Button>} />}>
        <Sections state={state} />
      </Shell>
    </Frame>
  );
}

// ---- 12. The tray
const TRAY_TODAY = `.r79-today .basalt-tray-band { order: -1; } .r79-today .basalt-tray-row { align-items: baseline; --_row-line: var(--basalt-text-sm-line-height); } .r79-today .basalt-tray-words { padding-block-start: 0; } .r79-today .basalt-tray-mark, .r79-today .basalt-tray-actions { align-items: baseline; height: auto; min-height: 0; }`;
function TrayDemo({ state }: { state: string }) {
  const today = mode(state).startsWith("before");
  const rows = bakery(state) ? (
    <>
      <TrayRow key="r1" mark={<Avatar name="Ana Ruiz" size={24} />} actions={<><Button size="sm" variant="primary">Approve</Button><Button size="sm">Later</Button></>}>Ana asks to swap the 5:30 van for the 6:00, so the rolls are not rushed</TrayRow>
      <TrayRow key="r2" mark={<Badge status="pending">Proof</Badge>} actions={<Button size="sm">Check</Button>}>Order 1042 needs a second proof</TrayRow>
      <TrayRow key="r3" stay mark={<Badge status="neutral">Oven 3</Badge>}>Heating to 230 °C</TrayRow>
    </>
  ) : (
    <>
      <TrayRow key="g1" mark={<Avatar name="Lee Marsh" size={24} />} actions={<><Button size="sm" variant="primary">Allow</Button><Button size="sm">Deny</Button></>}>Lee asks to recalibrate probe B during the high-water window</TrayRow>
      <TrayRow key="g2" mark={<Badge status="pending">Review</Badge>} actions={<Button size="sm">Open</Button>}>The tide table for next week is ready to check</TrayRow>
      <TrayRow key="g3" stay mark={<Badge status="neutral">Syncing</Badge>}>Sending readings to the harbour office</TrayRow>
    </>
  );
  return (
    <div className={today ? "r79-today" : undefined} style={{ maxWidth: 640 }}>
      {today ? <style>{TRAY_TODAY}</style> : null}
      <Tray label={({ waiting, reporting }) => (waiting ? "Waiting on you" : reporting ? "Under way" : "Clear")} sheetLabel="Waiting on you" summary={(n) => `${n} waiting on you`}>{rows}</Tray>
    </div>
  );
}

// ---- 13. Callout meta
function CalloutMeta({ state }: { state: string }) {
  return bakery(state) ? (
    <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
      <Callout status="warning" title="Cabinet 1 is above its set point" meta={<span>Since 05:40</span>}>Check the door seal before the next batch goes in.</Callout>
      <Callout title="Oven 3 runs hot at the back" meta={<Badge>Note</Badge>}>Turn the trays halfway through.</Callout>
    </div>
  ) : (
    <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
      <Callout status="danger" heading={3} title="Probe B is offline" meta={<Presence status="offline" since={Date.now() - 12 * 60_000} />}>Its readings are estimated from probe A until it reconnects.</Callout>
      <Callout status="success" title="Calibration finished" meta={<span>06:41</span>} />
    </div>
  );
}

const MEDIA = ["forced-colours", "reduced-motion"];

export const ROUND_79: Round = {
  id: "79",
  title: "cimip-gaps-3 T5: the shell, the page frame and the stream",
  reviewed: false,
  summary:
    "The council's T5 decision, built: an app page's rhythm and heading ladder, AppHeader's long title moved into the page under 720 with an echo in the bar, nothing pinned in a window under 480 tall, the rail at every width, a wide record sheet, an account under a site header, an app's lockup and a shared footnote, a page before the app, a pinned status bar outside the shell, the stream's quiet actions and the time as the entry's link (with the owner's scoped touch exception), a connection bar, the tray holding still under a pointer, and Callout's meta. Two tokens: size-breakpoint-short and size-sheet-width-wide. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "rhythm",
      name: "The app page's rhythm and ladder",
      intro: "AppSections, AppSection and AppSectionHead: sections 48 apart from 720 and 32 under it, sub-sections 32, the head's size by its position (16/24, then 14/20), its actions beside the title from 480 of its own width and under it below.",
      decisions: [
        "One row of sm actions adds 0px to a head from 720 on a fine pointer; on touch the head's first line is 44 and the title is centred on it. Wrapped actions take their height in the flow, never over the title or the body.",
        "`level` changes the tag only: a record sheet's sections pass level 3 and keep 16/24. The last ghost action with edge=\"end\" hangs on the page's line.",
        NOT_REVIEWED,
      ],
      tryIt: ["Narrow the window to 320: the actions go under the title and wrap, and nothing overflows."],
      states: ["bakery", "forced-colours"],
      widths: [1440, 390],
      touch: true,
      demo: ({ state }) => <Rhythm state={state} />,
    },
    {
      id: "phone-title",
      name: "For the owner: the page title in the page under 720",
      intro: "AppHeader phoneTitle=\"page\": under 720 the bar keeps its 56px and its actions, and the title (with its facts) is the page's own head, first in main; the bar echoes it once it has scrolled under. `before` is today's bar title, cut.",
      decisions: [
        "Bar, 16, the title and facts, 24, the page. One h1 at every width; shownHeading gives route focus the one shown. The echo is opacity only, the same under reduced motion; without script it stays hidden.",
        NOT_REVIEWED,
      ],
      tryIt: ["At 390, scroll: the title fades into the bar once the page's title has gone under it."],
      states: ["before@390", "echo@390", "bakery", "before-bakery@390"],
      widths: [1440, 390],
      touch: true,
      height: 844,
      demo: ({ state }) => <PhoneTitle state={state} />,
    },
    {
      id: "short",
      name: "A short window: nothing pinned under 480 tall",
      intro: "At 720 by 450 and 320 by 225 the header, the connection bar, the foot and the tab bar scroll with the page; at 1440 by 900 they are pinned as before.",
      decisions: ["size-breakpoint-short (480, a window's height). --basalt-sticky-top and --basalt-bottom-offset are 0 there; the header keeps its 56px and its fill. The sidebar and the rail stay beside the page.", NOT_REVIEWED],
      tryIt: ["Make the window shorter than 480: the bar scrolls away with the page, and the tab bar is at the page's end."],
      states: ["short@720", "short@320"],
      heights: { "short@720": 450, "short@320": 225 },
      widths: [1440],
      demo: ({ state }) => <Short state={state} />,
    },
    {
      id: "rail",
      name: "The rail at every width, capped",
      intro: "AppShell rail: the 72px rail from 720 at every width, the cap the rail plus the page's own 72rem (1224 at 16px text).",
      decisions: ["Everything the 720 to 1023 rail does: Nav collapsed, the label as name and tooltip, the brand's mark alone, the version as its number, the footnote's trigger alone.", NOT_REVIEWED],
      tryIt: ["Hover a rail item: its label is the tooltip."],
      states: ["bakery"],
      widths: [1600, 1024],
      demo: ({ state }) => <Rail state={state} />,
    },
    {
      id: "wide-sheet",
      name: "A wide side sheet for a record",
      intro: "SheetContent size=\"wide\": 720 at most the window less 48, a 680 body, the title at 18/26; the standard sheet keeps 440 and 20/28.",
      decisions: ["First focus is the title. Under 720 the window's width. Everything else is the sheet's.", NOT_REVIEWED],
      tryIt: ["Open it and press Esc: focus goes back to the opener."],
      states: ["open", "standard", "open-bakery"],
      widths: [1440, 390],
      height: 720,
      demo: ({ state }) => <WideSheet state={state} />,
    },
    {
      id: "account",
      name: "An app page under a site header, with an account",
      intro: "SiteHeader account: last in the bar from 720; under 720 a row of the narrow menu (open in `press-menu`), with no menu in the Menu button's place. AppPage, AppPageHead and AppSections under it; the theme choice is in the footer.",
      decisions: ["The same control in both places, so it takes no id. The bar at 320 keeps brand, tools and Menu.", NOT_REVIEWED],
      tryIt: ["At 390 open the menu: the account is the row under the links."],
      states: ["press-menu@390", "nolinks@390", "bakery"],
      widths: [1440, 390, 320],
      touch: true,
      demo: ({ state }) => <Account state={state} />,
    },
    {
      id: "brand",
      name: "The lockup and a shared footnote",
      intro: "AppBrand (the mark in a 36 seat with a subtitle, the name and a second line) and AppFootnote at the sidebar's foot; in the rail the mark alone and the footnote's trigger; under 720 a row of More's sheet, with More's `before` row.",
      decisions: ["Basalt draws nothing round the mark. The subtitle is secondary, never tertiary. A 32px lockup in a header draws as before (the brand's minimum height).", NOT_REVIEWED],
      tryIt: ["At 390 press More: Pause animations first, then the rows, then the footnote and the version."],
      states: ["press-more@390", "bakery"],
      widths: [1440, 800, 390],
      touch: true,
      demo: ({ state }) => <Brand state={state} />,
    },
    {
      id: "message",
      name: "A page before the app",
      intro: "MessagePage: one main, a prose-width block centred both ways, its lines on their start edge. At 320 by 225 its top is never cut and the page scrolls.",
      decisions: ["No panel, rim, header or smoke; never a loading screen.", NOT_REVIEWED],
      tryIt: ["Shorten the window: the block starts at the top and the page scrolls."],
      states: ["bakery", "short@320"],
      heights: { "short@320": 225 },
      widths: [1440, 390],
      bleed: true,
      demo: ({ state }) => <Message state={state} />,
    },
    {
      id: "pinned",
      name: "A pinned status bar outside the shell",
      intro: "StatusBar pinned in a SitePage: from 720 it sticks to its column's bottom and rests there on a short page; under 720 the phone form.",
      decisions: ["Its column must reach the bottom (SitePage is one). What it covers is measured on the box it sticks in.", NOT_REVIEWED],
      tryIt: ["Resize the window taller: the bar stays at the column's foot."],
      states: ["bakery"],
      widths: [1440, 390],
      touch: true,
      demo: ({ state }) => <Pinned state={state} />,
    },
    {
      id: "stream",
      name: "For the owner: the stream's quiet actions, and the time as a link, on touch",
      intro: "quietActions are revealed on hover and focus with a fine pointer from 720 (`hover`); on touch and under 720 one More control opens them in a popover (`more`). A joined entry carries them, and the time link, in a seat at its first line's end. `before` is today's stream.",
      decisions: [
        "The owner's exception (DECISIONS 393): More and the time link are 44 wide and keep their line, 32 tall in a head and 24 in a joined entry, never under 24 by 24, never over words.",
        "A joined entry that begins with a quote clears the seat's line; a must-not-miss action stays in `actions` (Stop).",
        NOT_REVIEWED,
      ],
      tryIt: ["Hover a joined line: its copy control and time appear at the line's end. At 390 tap the dots."],
      states: ["before", "hover", "more@390", "before-bakery@390", "bakery", ...MEDIA],
      widths: [1440, 390],
      touch: true,
      height: 640,
      demo: ({ state }) => <StreamDemo state={state} />,
    },
    {
      id: "connection",
      name: "For the owner: the connection bar, and the page moving by its height",
      intro: "ConnectionBar as AppShell's banner: Offline (the default shot), Reconnecting (braille), Disconnected (danger, said assertively) and Back online. It takes room in the flow: compare `before`, the page with the connection up.",
      decisions: ["Reconnecting waits a second after a connection that was up; an outage under a second draws nothing. Back online stays 5 seconds, held under the pointer or focus. Level 1, a divider, no coloured edge.", NOT_REVIEWED],
      tryIt: ["Hover Back online: it stays while the pointer is on it."],
      states: ["before", "reconnecting", "disconnected", "restored", "bakery", "forced-colours"],
      widths: [1440, 390],
      touch: true,
      demo: ({ state }) => <Connection state={state} />,
    },
    {
      id: "tray",
      name: "For the owner: the tray's order and first line at 390",
      intro: "Reports stand above the rows that wait (under 720 above the band); the mark, the words' first line and the buttons share one centre line, and a mark no longer makes a wrapped row taller. `before` is today's order and baseline. Under a pointer rows hold still (not shown in a still).",
      decisions: ["The words stay 13/18, as shipped; foundations said 14/20 and is corrected. label can follow what the tray holds; sheetLabel names the phone's sheet.", NOT_REVIEWED],
      tryIt: ["Rest the pointer on a button while a row is answered elsewhere: nothing under the pointer moves."],
      states: ["before@390", "before", "bakery", "before-bakery@390"],
      widths: [1440, 390],
      touch: true,
      demo: ({ state }) => <TrayDemo state={state} />,
    },
    {
      id: "callout",
      name: "Callout with a fact beside its title",
      intro: "Callout meta: a Presence, a badge or a time after the title on its baseline; whole on its own line when the two do not fit. The status icon is never replaced.",
      decisions: ["With heading, the heading holds the title alone. In forced colours each part keeps its own rule.", NOT_REVIEWED],
      tryIt: ["Narrow to 320: the meta moves whole under the title."],
      states: ["bakery", "forced-colours"],
      widths: [1440, 390, 320],
      demo: ({ state }) => <CalloutMeta state={state} />,
    },
  ],
};
