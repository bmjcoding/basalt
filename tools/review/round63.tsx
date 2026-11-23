// Round 63: the phone and what is pinned (cimip-gaps-2, batch B5; DECISIONS 226 and 265, the no-council path). Decided and built by Opus; the code review is
// Astra's and the pixels are the lead's, and neither has happened yet. The on-screen keyboard (a stand-in: a screenshot cannot raise one, so the root is given
// the geometry a phone's visual viewport reports and a grey block stands where the keyboard would be), measured pinned sizes, the app's foot that holds still,
// the tray of rows that wait on the reader with its phone sheet, 44px targets under 720 with a mouse (and stacked links that never take each other's taps),
// and the toast stack hanging from the bar on a phone (DECISIONS 274, the owner's pick). Two unlike domains: a support inbox and a build pipeline
// (and a shared document for the links). Every name and number is synthetic.

import * as React from "react";

import {
  AppHeader,
  AppShell,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  HomeGlyph,
  IconButton,
  Input,
  Link,
  MessagesGlyph,
  Nav,
  NavGroup,
  NavItem,
  SearchGlyph,
  SettingsGlyph,
  Sheet,
  SheetActions,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Spinner,
  TabBar,
  TabBarItem,
  Text,
  Tray,
  TrayRow,
  useToast,
  usePinnedEdges,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const MARK = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>;
const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

// ---- the stand-in keyboard: what a phone's visual viewport reports, written to the root, and a block where the keys would be ----

const KEYBOARD = 291;
function useStandInKeyboard(on: boolean) {
  React.useLayoutEffect(() => {
    if (!on) return undefined;
    const root = document.documentElement;
    root.setAttribute("data-screen-keyboard", "");
    root.style.setProperty("--basalt-keyboard-inset", `${KEYBOARD}px`);
    root.style.setProperty("--basalt-viewport-top", "0px");
    root.style.setProperty("--basalt-viewport-height", `${window.innerHeight - KEYBOARD}px`);
    return () => {
      root.removeAttribute("data-screen-keyboard");
      for (const name of ["--basalt-keyboard-inset", "--basalt-viewport-top", "--basalt-viewport-height"]) root.style.removeProperty(name);
    };
  }, [on]);
}
function StandInKeyboard() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", insetInline: 0, bottom: 0, height: KEYBOARD, zIndex: 2147483000, display: "grid", placeItems: "center", background: "var(--basalt-surface-sunken)", borderTop: "1px solid var(--basalt-border-input)", color: "var(--basalt-text-secondary)", fontSize: 13 }}>
      On-screen keyboard (a stand-in: the page lays out as it does over a real one)
    </div>
  );
}

// ---- a support inbox ----

const TABS = (
  <TabBar>
    <TabBarItem href="#inbox" icon={MessagesGlyph} current>Inbox</TabBarItem>
    <TabBarItem href="#search" icon={SearchGlyph}>Search</TabBarItem>
    <TabBarItem href="#home" icon={HomeGlyph}>Team</TabBarItem>
    <TabBarItem href="#settings" icon={SettingsGlyph}>Settings</TabBarItem>
  </TabBar>
);
const NAV = (
  <Nav aria-label="Main">
    <NavGroup label="Workspace">
      <NavItem href="#inbox" icon={MessagesGlyph} current count={3}>Inbox</NavItem>
      <NavItem href="#search" icon={SearchGlyph}>Search</NavItem>
      <NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem>
    </NavGroup>
  </Nav>
);
const THREAD = [
  ["Customer 1042", "Hello, I was charged twice for the November invoice. Could you check?"],
  ["You", "Thanks for writing. I can see two payments on the 3rd; I'll look into it now."],
  ["Customer 1042", "Thank you. The second one went through about a minute after the first."],
  ["You", "Found it: the second charge was a retry after a timeout. I've started a refund."],
  ["Customer 1042", "Great. Will it go back to the same card?"],
  ["You", "Yes, to the card ending 4417, in three to five working days."],
];
function Thread({ long = false }: { long?: boolean }) {
  const lines = long ? [...THREAD, ...THREAD, ...THREAD] : THREAD.slice(0, 3);
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      {lines.map(([who, said], i) => (
        <div key={i}>
          <Text size="sm" weight="medium">{who}</Text>
          <Text tone="secondary">{said}</Text>
        </div>
      ))}
    </div>
  );
}

function InboxTray({ field, rows = 3 }: { field?: React.RefObject<HTMLInputElement | null>; rows?: number }) {
  const all = [
    { id: "r", mark: <Badge variant="plain" status="pending">Approval</Badge>, words: "A refund of $48.00 to Customer 1042 needs your approval", action: "Approve" },
    { id: "j", mark: <Badge variant="plain" status="pending">Waiting</Badge>, words: "Customer 1077 has waited 2 hours for a first reply", action: "Reply" },
    { id: "a", mark: <Badge variant="plain" status="pending">Assigned</Badge>, words: "Ticket 1101 was handed to you by the night shift", action: "Open" },
  ];
  const [shown, setShown] = React.useState(all.slice(0, rows));
  return (
    <Tray label="Waiting on you" summary={(n) => `${n} waiting on you`} returnFocus={field}>
      {shown.map((row) => (
        <TrayRow key={row.id} mark={row.mark} actions={<Button size="sm" variant="primary" onClick={() => setShown((s) => s.filter((x) => x.id !== row.id))}>{row.action}</Button>}>
          {row.words}
        </TrayRow>
      ))}
      <TrayRow stay mark={<Spinner variant="braille" />}>Syncing the mailbox</TrayRow>
    </Tray>
  );
}

function InboxFoot({ tray = true }: { tray?: boolean }) {
  const field = React.useRef<HTMLInputElement | null>(null);
  return (
    <>
      {tray ? <InboxTray field={field} /> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <Input ref={field} aria-label="Reply to Customer 1042" placeholder="Write a reply" style={{ flex: 1 }} />
        <Button variant="primary">Send</Button>
      </div>
    </>
  );
}

function Inbox({ state }: { state: string }) {
  const kind = kindOf(state);
  const keyboard = kind.startsWith("keyboard");
  useStandInKeyboard(keyboard);
  const [sheet, setSheet] = React.useState(kind === "keyboard-sheet");
  const [dialog, setDialog] = React.useState(kind === "keyboard-dialog");
  React.useEffect(() => {
    if (kind === "long-end") window.scrollTo(0, document.documentElement.scrollHeight);
    if (kind === "keyboard") document.querySelector<HTMLInputElement>(".basalt-app-foot input")?.focus({ preventScroll: true });
  }, [kind]);
  return (
    <>
      <AppShell brand={<>{MARK}<span>Desk</span></>} brandMark={MARK} brandLabel="Desk home" sidebar={NAV} tabBar={TABS}
        header={<AppHeader title="Ticket 1042" actions={<IconButton icon={SettingsGlyph} label="Ticket settings" />} />}
        foot={<InboxFoot tray={kind !== "short"} />}>
        <Thread long={kind === "long" || kind === "long-end" || keyboard} />
      </AppShell>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom">
          <SheetTitle>Hand over the ticket</SheetTitle>
          <SheetDescription>Choose who takes it next.</SheetDescription>
          <Field label="Name" style={{ marginTop: 16 }}><Input placeholder="Search the team" /></Field>
          <SheetActions><Button variant="primary">Hand over</Button></SheetActions>
        </SheetContent>
      </Sheet>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogTitle>Rename the ticket</DialogTitle>
          <DialogDescription>The customer sees the new name.</DialogDescription>
          <Field label="Name" style={{ marginTop: 16 }}><Input defaultValue="Charged twice for November" /></Field>
        </DialogContent>
      </Dialog>
      {keyboard ? <StandInKeyboard /> : null}
    </>
  );
}

// ---- a build pipeline ----

function Pipeline({ state }: { state: string }) {
  const kind = kindOf(state);
  return (
    <AppShell brand={<>{MARK}<span>Pipeline</span></>} brandMark={MARK} brandLabel="Pipeline home"
      sidebar={<Nav aria-label="Main"><NavGroup label="Workspace"><NavItem href="#runs" icon={HomeGlyph} current>Runs</NavItem><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></NavGroup></Nav>}
      tabBar={<TabBar><TabBarItem href="#runs" icon={HomeGlyph} current>Runs</TabBarItem><TabBarItem href="#search" icon={SearchGlyph}>Search</TabBarItem><TabBarItem href="#settings" icon={SettingsGlyph}>Settings</TabBarItem></TabBar>}
      header={<AppHeader title="Build 412" />}
      foot={(
        <>
          <Tray label="Needs your review" summary={(n) => `${n} to review`}>
            <TrayRow mark={<Badge variant="plain" status="pending">Approval</Badge>} actions={<><Button size="sm" variant="secondary">Details</Button><Button size="sm" variant="primary">Approve</Button></>}>Deploy build 412 to production (eu-west, 3 services)</TrayRow>
            {kind === "short" ? null : <TrayRow mark={<Badge variant="plain" status="pending">Approval</Badge>} actions={<Button size="sm" variant="primary">Approve</Button>}>Run the database migration 0047 on staging</TrayRow>}
            <TrayRow stay mark={<Spinner variant="braille" />}>Build 413 is running its tests (212 of 480)</TrayRow>
          </Tray>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary">Cancel the run</Button>
            <Button variant="primary">Retry failed steps</Button>
          </div>
        </>
      )}>
      <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
        {Array.from({ length: kind === "short" ? 3 : 24 }, (_, i) => (
          <Text key={i} tone="secondary">{`Step ${i + 1}: ${["checkout", "install", "lint", "unit tests", "build", "package"][i % 6]} finished in ${(i * 7) % 50 + 4}s.`}</Text>
        ))}
      </div>
    </AppShell>
  );
}

// ---- measured pinned sizes: a strip under the bar, and a control that focus brings into view ----

function Pinned({ state }: { state: string }) {
  const measured = !kindOf(state).startsWith("fixed");
  usePinnedEdges(measured);
  React.useEffect(() => {
    // Scroll past the control, then focus it from the keyboard's side: the browser brings it back into view by the root's scroll padding.
    // Bring the control to the top of the page as the root's scroll padding says (what focus does for a control above the window), then focus it.
    const timer = window.setTimeout(() => {
      const target = document.getElementById("pinned-target");
      target?.scrollIntoView({ block: "start", behavior: "instant" });
      target?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div>
      <header className="basalt-chrome basalt-app-header" data-pinned-edge="top"><div className="basalt-app-bar"><h1 className="basalt-app-title">Build 412</h1></div></header>
      <div data-pinned-edge="top" style={{ position: "sticky", top: "var(--basalt-sticky-offset)", zIndex: 5, display: "flex", gap: 12, alignItems: "center", minHeight: 48, padding: "0 var(--basalt-gutter)", background: "var(--basalt-surface-page)", borderBottom: "1px solid var(--basalt-border-divider)" }}>
        <Badge variant="plain" status="pending">Running</Badge><Text size="sm" tone="secondary">eu-west · started 4 min ago · 212 of 480 tests</Text>
      </div>
      <div style={{ padding: "24px var(--basalt-gutter) 1400px", display: "grid", gap: 12, maxWidth: 640 }}>
        <Text tone="secondary">{measured ? "Measured (usePinnedEdges): the root's scroll padding is the bar plus the strip, so the focused control lands below both." : "Fixed (today's --basalt-sticky-offset): the scroll padding is the bar alone, so the focused control lands under the strip."}</Text>
        {Array.from({ length: 6 }, (_, i) => <Text key={i} tone="secondary">{`Step ${i + 1} finished.`}</Text>)}
        <div><Button id="pinned-target" variant="secondary">Retry step 7</Button></div>
        {Array.from({ length: 6 }, (_, i) => <Text key={i} tone="secondary">{`Step ${i + 8} is waiting.`}</Text>)}
      </div>
    </div>
  );
}

// ---- 44px targets under 720 with a mouse, and stacked links ----

function Targets({ state }: { state: string }) {
  const boxes = kindOf(state) === "boxes";
  return (
    <div style={{ padding: 16, display: "grid", gap: 24, justifyItems: "start", maxWidth: 420 }}>
      <style>{boxes ? ".wt-boxes .basalt-link::after, .wt-boxes .basalt-button { outline: 1px dashed var(--basalt-border-focus); outline-offset: -1px; } .wt-boxes .basalt-link { outline: 1px solid var(--basalt-text-tertiary); }" : ""}</style>
      <div className={boxes ? "wt-boxes" : undefined} style={{ display: "grid", gap: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="xs" variant="secondary">Stop</Button>
          <Button size="sm" variant="secondary">Pause</Button>
          <Button size="sm" variant="primary">Retry</Button>
        </div>
        <div>
          <Text size="sm" weight="medium">A shared document</Text>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 8 }}>
            <Link href="#draft">Open the draft</Link>
            <Link href="#comments">Read the 4 comments</Link>
            <Link href="#history">See the version history</Link>
          </div>
        </div>
        <div>
          <Text size="sm" weight="medium">A build pipeline</Text>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 8 }}>
            <Link href="#log">View the build log</Link>
            <Link href="#artifacts">Download the artifacts</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- the toast stack on a phone (DECISIONS 274, the owner's pick of option B): it hangs from the bar under 720 ----

function CheckInStrip() {
  usePinnedEdges();
  return (
    <div data-pinned-edge="top" style={{ position: "sticky", top: "var(--basalt-sticky-offset)", zIndex: 5, display: "flex", gap: 12, alignItems: "center", minHeight: 44, margin: "calc(-1 * var(--basalt-space-6)) calc(-1 * var(--basalt-gutter)) var(--basalt-space-6)", padding: "0 var(--basalt-gutter)", background: "var(--basalt-surface-page)", borderBottom: "1px solid var(--basalt-border-divider)" }}>
      <Badge variant="plain" status="pending">Draft</Badge><Text size="sm" tone="secondary">Week 31 · due Sunday</Text>
    </div>
  );
}
function ToastStack({ state }: { state: string }) {
  const kind = kindOf(state);
  const toast = useToast();
  const keyboard = kind === "keyboard";
  useStandInKeyboard(keyboard);
  React.useEffect(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const ids = [
      toast.show({ title: "Draft saved", home: "page", timeout: 0 }),
      toast.show({ title: "Check-in sent", description: "Your coach sees it in the morning.", status: "success", home: "page", timeout: 0 }),
    ];
    return () => ids.forEach((id) => toast.close(id));
  }, [toast]);
  return (
    <>
      <AppShell brand={<>{MARK}<span>Coach</span></>} brandMark={MARK} brandLabel="Coach home"
        sidebar={<Nav aria-label="Main"><NavGroup label="Workspace"><NavItem href="#today" icon={HomeGlyph} current>Today</NavItem></NavGroup></Nav>}
        tabBar={<TabBar><TabBarItem href="#today" icon={HomeGlyph} current>Today</TabBarItem><TabBarItem href="#messages" icon={MessagesGlyph}>Messages</TabBarItem><TabBarItem href="#settings" icon={SettingsGlyph}>Settings</TabBarItem></TabBar>}
        header={<AppHeader title="Weekly check-in" />}>
        {kind === "measured" ? <CheckInStrip /> : null}
        <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
          {["Weight this morning", "Waist", "Steps, daily average", "Sleep, nightly average", "Water, daily average", "Hunger, 1 to 5", "Energy, 1 to 5", "How did training feel?", "Anything for your coach?"].map((label) => (
            <Field key={label} label={label}><Input /></Field>
          ))}
          <div style={{ display: "flex", gap: 8 }}><Button variant="secondary">Save a draft</Button><Button variant="primary">Send check-in</Button></div>
        </div>
      </AppShell>
      {keyboard ? <StandInKeyboard /> : null}
    </>
  );
}

const PHONE = { widths: [390], scales: [2], bleed: true, touch: true, height: 844 };
const BOTH = { widths: [1440, 390], scales: [1, 2], bleed: true, touch: true, height: 844 };

export const ROUND_63: Round = {
  id: "63",
  title: "The phone and what is pinned (cimip-gaps-2, B5)",
  reviewed: false,
  summary:
    "The no-council path (DECISIONS 226 and 265): Opus decided and built it inside foundations; Astra's code review and the lead's pixel check have not happened, and the design panel did not review it. An on-screen keyboard lays Basalt's fixed parts out on what is still seen; a page can measure what is pinned over it; AppShell's foot holds still; a tray docks the rows that wait on the reader, with a phone sheet; targets are 44px under 720 whatever the pointer, and stacked links never take each other's taps; a toast that echoed a page closes when the page changes. Under 720 the toast stack hangs from the bar (DECISIONS 274, the owner's pick of option B). Two unlike domains, a support inbox and a build pipeline, and every name and number is synthetic.",
  steps: [
    {
      id: "keyboard",
      name: "An on-screen keyboard",
      intro: "A phone's keyboard covers the window's bottom and only the visual viewport shrinks. While one is up, the root carries its geometry and what is fixed to the window is laid out on what is seen. The grey block is a stand-in for the keyboard.",
      decisions: [
        "The tab bar and the phone's status bar are chrome: covered by the keyboard and not drawn, as a platform's own bars are. --basalt-bottom-offset is 0 while it is up.",
        "What is the task rides above it: the foot and the toasts stand on the keyboard, a bottom sheet stands on it at 90% of what is seen, a side sheet and a full-screen form are what is seen, a dialog is centred in it, and the command menu hangs from its top.",
        "It is a keyboard when the visual viewport is at least 120px shorter than the window at a scale of 1: a pinch and a browser's own bars are not one. Nothing is written while none is up.",
        "Popups anchored to a field (Select, Combobox, Menu) are Base UI's, whose placement already reads the visual viewport: they flip or shrink above it (tested).",
        "The hook installs itself from Basalt's modals, AppShell, TabBar and ToastProvider; an app's own fixed parts call useScreenKeyboardLayout().",
      ],
      tryIt: ["On a phone, tap the reply field: the foot rises onto the keyboard and the tab bar goes.", "Open the hand-over sheet with the keyboard up: its action stays reachable above it."],
      states: ["keyboard", "keyboard-sheet", "keyboard-dialog", "keyboard-forced-colours", "keyboard-reduced-motion"],
      ...PHONE,
      demo: ({ state }) => <Inbox state={state} />,
    },
    {
      id: "foot",
      name: "The app's foot holds still",
      intro: "AppShell's foot: a band pinned to the content column's bottom (a reply field, an action bar) in the same place on a short page and a long one.",
      decisions: [
        "The column is at least the window's height and the page takes the room between, so on a short page the foot rests at the window's bottom; on a long page it sticks there. Under 720 it sits on the tab bar.",
        "A band, not a box: solid surface-page with a border-divider on top (the header is the one smoked surface), no shadow, its contents on the page's width and edges.",
        "Never taller than the window less what covers the top and one 44px row; past that it scrolls inside, and a tray in it gives way first. At the page's end the page's last line is above it.",
        "With a foot the shell measures what is pinned, so focus and the toast stack stay clear of it.",
      ],
      tryIt: ["Scroll the long thread: the foot never moves.", "Compare the short pipeline page: the foot is in the same place."],
      states: ["short", "long", "long-end", "long-end-forced-colours", "long-end-reduced-motion"],
      ...BOTH,
      demo: ({ state }) => (kindOf(state) === "short" ? <Pipeline state={state} /> : <Inbox state={state} />),
    },
    {
      id: "tray",
      name: "A tray of rows that wait on the reader",
      intro: "Tray and TrayRow: what waits on the reader, docked where they work. From 720 a level-1 panel of rows; under 720 one band that opens them in a bottom sheet.",
      decisions: [
        "A row is a mark (a pending Badge), its words and its sm actions on the first line's baseline; the words wrap and are never cut. 40 tall, 44 on touch and under 720.",
        "Under 720 the rows that wait are one band, the panel's whole width: the app's count words at 500, Show in secondary, the hover wash and the flush −2 ring, opening a bottom sheet titled with the tray's name. A row that only reports (stay: a sync, a run) stays a row of the tray.",
        "Focus is never lost to a row that leaves: the row now at its place takes it; after the last, the sheet closes by itself and focus goes to the app's field (returnFocus).",
        "A named region, not a live region: the app says a new row through its one StatusLine. Words and nouns are the app's (label, summary); Basalt ships only Show and Close.",
      ],
      tryIt: ["Approve a row: focus moves to the next row's action.", "At 390, press the band, then answer every row: the sheet closes and focus lands in the reply field."],
      states: ["pipeline", "sheet@390", "sheet-forced-colours@390", "pipeline-forced-colours", "pipeline-reduced-motion"],
      ...BOTH,
      demo: ({ state }) => <TrayStep state={state} />,
    },
    {
      id: "pinned",
      name: "Measured pinned sizes",
      intro: "A page that pins a strip under its bar opts into usePinnedEdges: the root's scroll padding becomes what really covers the top, so a focused control is never under the strip (WCAG 2.4.11).",
      decisions: [
        "Every element marked data-pinned-edge (Basalt's bars, ListBand, the tab bar, the status bar and the foot carry it; an app marks its own) that is sticky or fixed and drawn now is counted into --basalt-pinned-top and --basalt-pinned-bottom.",
        "The fixed values stay for a page that does not opt in, so no page that exists today changes.",
      ],
      tryIt: ["Compare the two shots: the same Tab, the bar alone (fixed) and the bar plus the strip (measured)."],
      states: ["measured", "fixed", "fixed-forced-colours", "measured-reduced-motion"],
      widths: [1440, 390],
      scales: [1, 2],
      bleed: true,
      touch: true,
      height: 600,
      demo: ({ state }) => <Pinned state={state} />,
    },
    {
      id: "targets",
      name: "44px targets under 720, with a mouse",
      intro: "Under 720 the touch sizes apply whatever the pointer: a phone-width window with a mouse draws the phone's 44px controls and link boxes. Shot with a mouse, not a finger.",
      decisions: [
        "Every rule that drew a 44px target on a coarse pointer also applies under 720. Text entry alone stays 16px only on a coarse pointer (it is there to stop iOS zooming).",
        "Stacked links keep their lines (no layout change) and their 44px boxes; each link's words are a label raised over its neighbours' boxes, so a tap on a link's own words is always that link's. The boxes shot shows each link's box dashed.",
        "From 720 with a mouse nothing changes.",
      ],
      tryIt: ["Narrow the window under 720: the buttons grow to 44 and nothing else moves.", "Click the bottom edge of 'Open the draft': it opens the draft, not the comments."],
      states: ["boxes@390"],
      widths: [1440, 390],
      scales: [2],
      height: 520,
      demo: ({ state }) => <Targets state={state} />,
    },
    {
      id: "toast-stack",
      name: "The toast stack on a phone hangs from the bar",
      intro: "The owner's pick (DECISIONS 274, option B, from CoachStakk's CS19): under 720 the stack hangs from the bar, so a form's last action, the tab bar and a foot are never under it. From 720 nothing changes.",
      decisions: [
        "Under 720: full width, space-2 below the bar's line (space-4 from the top edge and its safe area with no bar). The front toast is at the top and the ones behind peek below it.",
        "What covers the top moves it down: a band stuck under the bar when the page measures what is pinned (usePinnedEdges), and while an on-screen keyboard is up it stays under the bar.",
        "A toast enters from the top edge it hangs from and leaves to it (opacity only under reduced motion); a swipe up or to the side dismisses it. The same in the HTML skill's toast module.",
        "A toast whose only home is the page closes when the page changes (useRouteFocus, or useToast().pageChanged()).",
      ],
      tryIt: ["At 390, scroll to Send check-in: the toasts are at the top, under the bar.", "Hover or focus the stack: it opens downward."],
      states: ["measured@390", "keyboard@390", "default-forced-colours", "default-reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      bleed: true,
      touch: true,
      height: 844,
      demo: ({ state }) => <ToastStack state={state} />,
    },
  ],
};

function TrayStep({ state }: { state: string }) {
  const kind = kindOf(state);
  React.useEffect(() => {
    if (kind !== "sheet") return undefined;
    const timer = window.setTimeout(() => document.querySelector<HTMLButtonElement>(".basalt-tray-band")?.click(), 80);
    return () => window.clearTimeout(timer);
  }, [kind]);
  return kind === "pipeline" ? <Pipeline state="long" /> : <Inbox state="long" />;
}
