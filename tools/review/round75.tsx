// Round 75: cimip-gaps-3 topic T3, lists, tables, text and notifications (the council's decision: Neon and Muse drafted, Astra checked, Fable decided, and the
// final positions answered; t3/decision.md). Built by Opus; the implementation is not reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Three changes alter a shipped part's pixels and lead with before and after: TableCall in a rimmed table (40 to 54), the narrow one-page band, and the held
// foot drawing nothing. The "today" side of each is this build with the change taken back by a style scoped to that side, so the two differ only there.

import { ThermometerIcon, TruckIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Avatar,
  Badge,
  Button,
  Card,
  Disclosure,
  DisclosureList,
  DisclosureRow,
  FilterToolbar,
  CheckGlyph,
  HomeGlyph,
  Icon,
  Link,
  ListBand,
  MessagesGlyph,
  NotificationCenter,
  NotificationList,
  NotificationsGlyph,
  PanelList,
  PanelRow,
  PlanGlyph,
  Select,
  TabBar,
  TabBarItem,
  Table,
  TableBody,
  TableCall,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Text,
  TrendsGlyph,
} from "../../packages/react/src/index";
import type { NotificationEntry } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-6)", minWidth: 0 };
const PAIR = ".r75-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 1024px) { .r75-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
const NOT_REVIEWED = "Decided by the council (cimip-gaps-3 T3, t3/decision.md, with its revisions after the final positions); built by Opus; the implementation is not reviewed. The browser tests are written and not run (DECISIONS 359).";
const hold = (state: string, name: string) => state === name || state.startsWith(`${name}-`);
/** Focus an element as the keyboard would, once the page has settled (a screenshot cannot press Tab). */
const useKeyFocus = (selector: string, on: boolean) => React.useEffect(() => {
  if (!on) return undefined;
  const timer = window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ focusVisible: true } as FocusOptions), 200);
  return () => window.clearTimeout(timer);
}, [selector, on]);

// ---- 1: a cell that wraps ----

const RULES = [
  { id: "r1", name: "Free shipping", rule: "Orders over 50 ship free inside the country.", status: "On", uses: 1204 },
  { id: "r2", name: "Bulk discount", rule: "Ten or more of one item take 8% off the line, after any coupon and before tax.", status: "On", uses: 316 },
  { id: "r3", name: "Gift wrap", rule: "Offered on every item except perishables, oversize parcels and anything sent from a partner's warehouse.", status: "Off", uses: 48 },
];
const STEPS = [
  { id: "s1", name: "Autolyse", step: "Mix flour and water; rest 45 minutes.", time: "45m" },
  { id: "s2", name: "Bulk ferment", step: "Four sets of folds at half-hour intervals, then leave covered until it has grown by half and the surface is domed.", time: "4h" },
  { id: "s3", name: "Bake", step: "Lid on at the highest heat for twenty minutes, then lid off until deep brown.", time: "45m" },
];

function RulesTable({ density }: { density: "compact" | "default" | "comfortable" }) {
  return (
    <TableContainer density={density} label={`Checkout rules, ${density}`}>
      <Table columns={[{ width: 140 }, {}, { width: 96 }, { width: 80 }]} minWidth={560} pinned={1}>
        <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>What it does</TableHead><TableHead>Status</TableHead><TableHead numeric>Uses</TableHead></TableRow></TableHeader>
        <TableBody>
          {RULES.map((r) => (
            <TableRow key={r.id}>
              <TableRowHead>{r.name}</TableRowHead>
              <TableCell wrap>{r.rule}</TableCell>
              <TableCell><Badge status={r.status === "On" ? "success" : "neutral"}>{r.status}</Badge></TableCell>
              <TableCell numeric>{r.uses.toLocaleString("en-US")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function WrapCells() {
  return (
    <div style={stack}>
      {(["compact", "default", "comfortable"] as const).map((d) => (
        <div key={d}><p style={label}>A shop's checkout rules, {d}: one line is the row ({d === "compact" ? 32 : d === "default" ? 40 : 44}), each more line adds 18; the badge and the number stay centred</p><RulesTable density={d} /></div>
      ))}
      <div>
        <p style={label}>A kitchen's method: the step wraps, the step's name is the pinned row head, the time is a fixed form and never wraps</p>
        <TableContainer label="Sourdough method">
          <Table columns={[{ width: 132 }, {}, { width: 72 }]} minWidth={480} pinned={1}>
            <TableHeader><TableRow><TableHead>Step</TableHead><TableHead>Method</TableHead><TableHead numeric>Time</TableHead></TableRow></TableHeader>
            <TableBody>{STEPS.map((s) => <TableRow key={s.id}><TableRowHead>{s.name}</TableRowHead><TableCell wrap>{s.step}</TableCell><TableCell numeric>{s.time}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

// ---- 2: the call's air in a rimmed table (before and after) ----

const CALL_UNDO = ".r75-today .basalt-table-container .basalt-table :is(td, tbody th[scope='row']):has(> .basalt-table-call) { padding-block: 0 !important; }";

function CallTables({ today }: { today: boolean }) {
  return (
    <div className={today ? "r75-today" : undefined} style={stack}>
      <p style={label}>{today ? "Today (main): a call in a rimmed table is 38px of text in a 40px row" : "This build: space-2 above and below, so a call row is 54 in every table"}</p>
      <TableContainer label={today ? "Orders, today" : "Orders"}>
        <Table columns={[{}, { width: 96 }]} minWidth={360}>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead numeric>Total</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell><TableCall call="Order 4127 held" detail="Address check failed; the buyer was asked to confirm" /></TableCell><TableCell numeric>$84.20</TableCell></TableRow>
            <TableRow><TableCell><TableCall call="Order 4128 refunded" detail="Two items out of stock" /></TableCell><TableCell numeric>$19.00</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer density="compact" label={today ? "Prep list, today" : "Prep list"}>
        <Table columns={[{}, { width: 96 }]} minWidth={360}>
          <TableHeader><TableRow><TableHead>Prep</TableHead><TableHead>Station</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell><TableCall call="Stock reduced" detail="Strain twice before service" /></TableCell><TableCell>Sauce</TableCell></TableRow>
            <TableRow><TableCell><TableCall call="Herbs picked" detail="Keep under damp cloth" /></TableCell><TableCell>Garde manger</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ---- 5: a row that opens what it names ----

const LOANS = [
  { id: "L-101", title: "The Left Hand of Darkness", member: "Ada Brooks", due: "Dec 2" },
  { id: "L-102", title: "A Wizard of Earthsea, the illustrated anniversary edition", member: "Sam Okafor", due: "Dec 9" },
  { id: "L-103", title: "The Dispossessed", member: "Priya Nair", due: "Dec 12" },
];

function LinkedRows({ state }: { state: string }) {
  useKeyFocus("#r75-loans tbody tr:nth-child(2) th a", hold(state, "link-focus"));
  return (
    <div style={stack}>
      <div>
        <p style={label}>A library's loans: a press anywhere on a row follows the loan's link; the link is the one control and keeps its own ring</p>
        <TableContainer id="r75-loans" label="Loans">
          <Table columns={[{ width: 88 }, {}, { width: 140 }, { width: 80 }]} minWidth={560} pinned={1}>
            <TableHeader><TableRow><TableHead>Loan</TableHead><TableHead>Title</TableHead><TableHead>Member</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
            <TableBody>{LOANS.map((l) => <TableRow key={l.id} linked><TableRowHead><a className="basalt-link" href={`#${l.id}`} onClick={(e) => e.preventDefault()}>{l.id}</a></TableRowHead><TableCell>{l.title}</TableCell><TableCell>{l.member}</TableCell><TableCell>{l.due}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </div>
      <div>
        <p style={label}>A shop's returns: the opener is marked (data-row-opener), and the row's own Approve button keeps its press</p>
        <TableContainer label="Returns">
          <Table columns={[{}, { width: 120 }, { width: 112 }]} minWidth={480}>
            <TableHeader><TableRow><TableHead>Return</TableHead><TableHead>Reason</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {[["R-88", "Wrong size"], ["R-89", "Damaged"]].map(([id, why]) => (
                <TableRow key={id} linked><TableCell><a className="basalt-link" data-row-opener="" href={`#${id}`} onClick={(e) => e.preventDefault()}>Return {id}</a></TableCell><TableCell>{why}</TableCell><TableCell><Button size="sm" variant="secondary">Approve</Button></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

// ---- 3: cut text ----

const FILES = ["quarterly-results-final-v3-approved-by-finance.pdf", "store-photos-spring-window-display.zip", "returns.csv"];

function CutText({ state }: { state: string }) {
  useKeyFocus("#r75-desc", hold(state, "peek-text"));
  useKeyFocus("#r75-files li:first-child a", hold(state, "peek-link"));
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <div style={stack}>
        <div style={{ maxWidth: 320 }}>
          <p style={label}>A product's description, two lines (its own stop: focus opens it whole on the plate)</p>
          <Text id="r75-desc" size="sm" tone="secondary" lines={2}>Hand-thrown stoneware mug, glazed in a speckled oat finish, holds 350 ml, dishwasher safe, each one a little different from the next because every glaze pools on its own.</Text>
        </div>
        <div style={{ maxWidth: 320 }}>
          <p style={label}>Files, one cut line each, inside their links (the link is the stop; without hover the name is whole)</p>
          <ul id="r75-files" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "var(--basalt-space-2)" }}>
            {FILES.map((f) => <li key={f}><Link href={`#${f}`} onClick={(e: React.MouseEvent) => e.preventDefault()}><Text as="span" size="sm" lines={1}>{f}</Text></Link></li>)}
          </ul>
        </div>
      </div>
      <div style={stack}>
        <Card style={{ maxWidth: 340 }}>
          <p style={label}>A recipe card's excerpt: the card links to the recipe, so peek is off</p>
          <a href="#recipe" className="basalt-link" onClick={(e) => e.preventDefault()} style={{ display: "block", textDecoration: "none" }}>
            <Text as="span" weight="medium" lines={1}>Brown butter sourdough waffles</Text>
            <Text as="span" size="sm" tone="secondary" lines={2} peek={false}>An overnight batter that uses the discard from your starter, browned butter for depth and a hot iron for a crisp shell with a soft middle.</Text>
          </a>
        </Card>
        <div style={{ maxWidth: 220 }}>
          <p style={label}>Short text is not cut: no stop, no plate</p>
          <Text size="sm" lines={1}>Ready for pickup</Text>
        </div>
      </div>
    </div>
  );
}

// ---- 4: PanelRow ----

function PanelRows({ state }: { state: string }) {
  useKeyFocus("#r75-suppliers .basalt-panel-row-trigger", hold(state, "trigger-focus"));
  useKeyFocus("#r75-suppliers .basalt-panel-row-actions .basalt-button", hold(state, "action-focus"));
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <div>
        <p style={label}>A kitchen's suppliers: a split row (open, and call), one target, a wrapped row and a static one</p>
        <PanelList id="r75-suppliers" aria-label="Suppliers">
          <PanelRow href="#dana" onClick={(e) => e.preventDefault()} title="Dana Brooks" description="Flour and grain, two deliveries a week" leading={<Avatar name="Dana Brooks" size={24} />} trailing="2m ago"
            actions={<Button size="sm" variant="secondary">Call +1 912-555-0142</Button>} />
          <PanelRow href="#sam" onClick={(e) => e.preventDefault()} title="Sam Okafor" description="Dairy and eggs" leading={<Avatar name="Sam Okafor" size={24} />} trailing="Yesterday" />
          <PanelRow wrap href="#greens" onClick={(e) => e.preventDefault()} title="Riverside Greens cooperative, the farm shared with three restaurants" description="Leaves, herbs and edible flowers, picked the morning they arrive" leading={<Avatar name="Riverside Greens" size={24} />} trailing="Mon"
            actions={<><Button size="sm" variant="secondary">Call</Button><Button size="sm" variant="ghost" aria-label="Message Riverside Greens">Message</Button></>} />
          <PanelRow interactive={false} title="Harbour Fish" description="No longer delivering" leading={<Avatar name="Harbour Fish" size={24} />} trailing="Archived" />
        </PanelList>
      </div>
      <div>
        <p style={label}>A library's members: split rows with a link inside a line of words (it sits above the row's cover)</p>
        <PanelList aria-label="Members">
          <PanelRow href="#ada" onClick={(e) => e.preventDefault()} title="Ada Brooks" description="Three loans, one due this week" trailing={<Badge status="warning">Due soon</Badge>}
            actions={<Button size="sm" variant="secondary">Renew all</Button>}>
            <span style={{ fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)", color: "var(--basalt-text-secondary)" }}>Card <Link href="#card-2209">C-2209</Link></span>
          </PanelRow>
          <PanelRow href="#priya" onClick={(e) => e.preventDefault()} title="Priya Nair" description="No loans" trailing="Joined Oct" />
        </PanelList>
      </div>
    </div>
  );
}

// ---- 10: a DisclosureRow in a PanelList ----

function PanelDisclosures({ state }: { state: string }) {
  useKeyFocus("#r75-faq > li:nth-child(2) .basalt-disclosure-row", hold(state, "row-focus"));
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <div>
        <p style={label}>A shop's questions: each row is a band (padding, divider, wash, the -2 ring); the second is open</p>
        <PanelList id="r75-faq" aria-label="Shipping questions">
          <li><DisclosureRow title="Where is my order?" meta="2 min read">The tracking link is in the confirmation email; it updates when the carrier scans the parcel.</DisclosureRow></li>
          <li><DisclosureRow defaultOpen title="Can I change the address after ordering?">Until the parcel is packed, yes: write to us with the order number. <Link href="#help">Contact support</Link></DisclosureRow></li>
          <li><DisclosureRow title="How do returns work?">Thirty days, unworn, with the slip.</DisclosureRow></li>
        </PanelList>
      </div>
      <div>
        <p style={label}>A kitchen's shift notes, mixed with a panel row</p>
        <PanelList aria-label="Shift notes">
          <PanelRow href="#notes" onClick={(e) => e.preventDefault()} title="Tonight's covers" trailing="84" />
          <li><DisclosureRow mark={<Icon icon={ThermometerIcon} size={16} />} title="Walk-in cooler ran warm">Reading 6°C at 14:10; back to 3°C by 14:40.</DisclosureRow></li>
          <li><DisclosureRow mark={<Icon icon={TruckIcon} size={16} />} title="Fish delivery late">Arrived 16:20; menu unchanged.</DisclosureRow></li>
        </PanelList>
      </div>
    </div>
  );
}

// ---- 6: the sort over a list ----

const BOOKS = [{ id: "a", t: "Kindred", by: "Octavia E. Butler" }, { id: "b", t: "Beloved", by: "Toni Morrison" }, { id: "c", t: "The Fifth Season", by: "N. K. Jemisin" }];

function SortedList() {
  const [order, setOrder] = React.useState("own");
  const rows = order === "title" ? [...BOOKS].sort((x, y) => x.t.localeCompare(y.t)) : BOOKS;
  return (
    <div style={{ ...stack, maxWidth: 720 }}>
      <p style={label}>A library's reading list: the sort is a Select in the toolbar's sort slot, its options say the field and the direction; sortLabel=false, the select says "Sort"</p>
      <FilterToolbar label="Sort reading list" sortLabel={false} sort={<Select toolbar aria-label="Sort" valuePrefix="Sort" value={order} onValueChange={(v) => setOrder(String(v))} options={[{ value: "own", label: "As added" }, { value: "title", label: "Title A to Z" }, { value: "newest", label: "Newest first" }]} />} />
      <DisclosureList aria-label="Reading list">{rows.map((b) => <DisclosureRow key={b.id} title={b.t} meta={b.by}>Synthetic notes on {b.t}.</DisclosureRow>)}</DisclosureList>
    </div>
  );
}

// ---- 7: Disclosure and DisclosureList ----

function Disclosures({ state }: { state: string }) {
  useKeyFocus("#r75-why button", hold(state, "prose-focus"));
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <div style={{ ...stack, maxWidth: 560 }}>
        <div>
          <p style={label}>In prose (a kitchen's method): the chevron leads, the title wraps at the size it sits in; the second is open</p>
          <p style={{ margin: 0, fontSize: "var(--basalt-text-md-size)", lineHeight: "var(--basalt-text-md-line-height)" }}>Shape the dough and leave it in the fridge overnight.</p>
          <Disclosure id="r75-why" title="Why overnight, and not two hours on the counter?"><p style={{ margin: 0 }}>A slow, cold proof builds flavour and makes the dough easier to score.</p></Disclosure>
          <Disclosure defaultOpen title="What if my kitchen is warm?"><p style={{ margin: 0 }}>Shorten the bulk ferment by a third and watch the dough, not the clock.</p></Disclosure>
        </div>
        <div>
          <p style={label}>In a library's terms, at text-sm</p>
          <p style={{ margin: 0, fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)", color: "var(--basalt-text-secondary)" }}>Loans run three weeks and renew twice.</p>
          <div style={{ fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)" }}><Disclosure title="Fines for late returns"><p style={{ margin: 0 }}>None for members under 18.</p></Disclosure></div>
        </div>
      </div>
      <div>
        <p style={label}>A ruled list of rows (an order's history): rows are li, 40 tall (44 on touch), a mark's seat kept by every row, a wrap row whole while closed</p>
        <DisclosureList aria-label="Order history">
          <DisclosureRow mark={<Icon icon={CheckGlyph} size={16} />} title="Payment captured" meta="9:02">Card ending 4242.</DisclosureRow>
          <DisclosureRow title="Packed at the north warehouse" meta="11:40">Two boxes.</DisclosureRow>
          <DisclosureRow wrap title="Carrier picked it up and the tracking number was sent to the buyer by email and text" meta="15:15">Tracking 1Z 999 AA1 01 2345 6784.</DisclosureRow>
          <DisclosureRow defaultOpen title="Delivery attempted; the buyer was out and a note was left at the door" meta="Next day">Redelivery is booked for Thursday.</DisclosureRow>
        </DisclosureList>
      </div>
    </div>
  );
}

// ---- 8: notifications ----

const NOTES: NotificationEntry[] = [
  { id: "m1", title: "Priya mentioned you on the spring menu draft the whole kitchen is reviewing", description: "Menus, spring", time: "2m ago", unread: true, direct: true },
  { id: "o1", title: "Order 4127 shipped", time: "1h ago", unread: true, count: 3, status: "success" },
  { id: "g1", title: "Sam and Ada replied to your note", time: "3h ago", entries: [{ id: "g1a", title: "Sam replied", time: "3h ago", unread: true, direct: true }, { id: "g1b", title: "Ada replied", time: "4h ago", unread: true }] },
  { id: "r1", title: "Stock count finished", time: "Yesterday" },
];
const PLAIN = NOTES.map((e) => ({ ...e, direct: false, entries: e.entries?.map((c) => ({ ...c, direct: false })) }));
const READ = NOTES.map((e) => ({ ...e, unread: false, entries: e.entries?.map((c) => ({ ...c, unread: false })) }));
const LOANS_NOTES: NotificationEntry[] = [
  { id: "l1", title: "Ada asked you to approve a hold on The Dispossessed", time: "5m ago", unread: true, direct: true, status: "pending" },
  { id: "l2", title: "Three loans are due back this week across the east branch", description: "Circulation", time: "1h ago", unread: true, count: 3 },
  { id: "l3", title: "Catalogue import finished", time: "Mon" },
];

function Bells() {
  return (
    <div style={{ display: "flex", gap: "var(--basalt-space-8)", alignItems: "center", flexWrap: "wrap" }}>
      {([["Nothing unread", READ], ["Unread", PLAIN], ["Unread, one for you", NOTES]] as const).map(([name, entries]) => (
        <div key={name} style={{ display: "grid", justifyItems: "center", gap: "var(--basalt-space-2)" }}><NotificationCenter entries={entries} /><span style={label}>{name}</span></div>
      ))}
    </div>
  );
}

function Notifications({ state }: { state: string }) {
  if (hold(state, "open")) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 560 }}>
        <NotificationCenter defaultOpen entries={NOTES} onMarkAllRead={() => {}} onClearAll={() => {}} markAllReadReason="Marking is off while the menu is in review." />
      </div>
    );
  }
  if (hold(state, "loading")) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 400 }}>
        <NotificationCenter defaultOpen entries={[]} loading onMarkAllRead={() => {}} />
      </div>
    );
  }
  return (
    <div style={stack}>
      <div><p style={label}>The bell's three states: one dot means unread; a dot in a ring means unread and for you. The button never changes width.</p><Bells /></div>
      <div className="r75-pair">
        <style>{PAIR}</style>
        <div>
          <p style={label}>A library's notifications page: wrap, "3 unread · 1 for you", a count on an entry, the ringed dot, and Clear all off with its reason</p>
          <NotificationList entries={LOANS_NOTES} wrap onMarkAllRead={() => {}} onClearAll={() => {}} clearAllReason="Clearing waits for the nightly export." />
        </div>
        <div>
          <p style={label}>A kitchen's page list, empty once known (its own words)</p>
          <NotificationList entries={[]} empty="No notes yet. They arrive here when a station sends one." onMarkAllRead={() => {}} />
        </div>
      </div>
    </div>
  );
}

function Tabs() {
  return (
    <div style={{ minHeight: 200 }}>
      <p style={label}>The phone tab bar: Messages with a plain dot, Notifications with the ringed dot (dotKind="direct"); the current page is the filled glyph alone</p>
      <TabBar>
        <TabBarItem href="#home" icon={HomeGlyph} current>Home</TabBarItem>
        <TabBarItem href="#messages" icon={MessagesGlyph} dot="New activity">Messages</TabBarItem>
        <TabBarItem href="#alerts" icon={NotificationsGlyph} dot="3 unread, 1 for you" dotKind="direct">Alerts</TabBarItem>
        <TabBarItem href="#trends" icon={TrendsGlyph}>Trends</TabBarItem>
        <TabBarItem href="#plan" icon={PlanGlyph}>Plan</TabBarItem>
      </TabBar>
    </div>
  );
}

// ---- 9 and 11: ListBand at one page (before and after) ----

const BAND_UNDO = [
  "@container (width < 640px) { .r75-today .basalt-list-band-row > .basalt-pagination { display: flex !important; } .r75-today .basalt-list-band-row > .basalt-list-band-range { display: none !important; } }",
  ".r75-today .basalt-list-band-foot .basalt-pagination[data-whole] .basalt-pagination-summary { visibility: visible !important; }",
].join(" ");

function Band({ total, noun, props }: { total: number; noun: string; props?: Partial<React.ComponentProps<typeof ListBand>> }) {
  const [size, setSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  return (
    <ListBand total={total} maxTotal={240} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun={noun} backToTop={false} {...props}>
      <PanelList aria-label={noun}>{Array.from({ length: Math.min(size, total) }, (_, i) => <PanelRow key={i} href={`#${noun}-${i}`} onClick={(e) => e.preventDefault()} title={`${noun.slice(0, -1)} ${i + 1}`} trailing="Today" />)}</PanelList>
    </ListBand>
  );
}

function Bands({ today }: { today: boolean }) {
  return (
    <div className={today ? "r75-today" : undefined} style={stack}>
      <style>{BAND_UNDO}</style>
      <p style={label}>{today ? "Today (main): at one page the narrow band holds two hidden arrows and the held foot draws a lone count" : "This build: the narrow one-page band draws the range and the page size on one row; the held foot draws nothing"}</p>
      <Band total={4} noun="Orders" props={{ keepFootRoom: true, footLabel: "Order pages, end of list" }} />
      <Band total={3} noun="Loans" props={{ onePage: "size" }} />
    </div>
  );
}

export const ROUND_75: Round = {
  id: "75",
  title: "cimip-gaps-3 T3: lists, tables, text and notifications",
  reviewed: false,
  summary:
    "The council's T3 decision, built: a table cell that wraps, the call's air in every table, a row that opens what it names, cut text read whole, PanelRow's wrap, actions and static form, a DisclosureRow in a PanelList, the sort over a list, Disclosure and DisclosureList, the notification centre's wrap, counts, ringed dot, reasons, loading and empty words, and ListBand at one page. Three shipped parts change pixels and lead with before and after. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "call-air",
      name: "Before and after: a TableCall in a rimmed table (40 to 54)",
      intro: "Only the flat table padded its cells, so a two-line call in a rimmed table was 38px of text in a 40px row. A cell holding a TableCall now takes space-2 above and below in every table, so a call row is 54 in every density.",
      decisions: ["Item 2 of the decision: no column folds with width (never a hidden column; 900 and 1280 are not adopted). Facts a reader does not compare live in the name cell's TableCall; values a reader compares stay columns: pin the name and scroll.", "No TableCall truncate: a call exists to wrap.", NOT_REVIEWED],
      tryIt: ["Compare the two sides at 390: the call rows have air above and below on the right."],
      widths: [1440, 390],
      height: 520,
      demo: () => <div className="r75-pair"><style>{`${PAIR} ${CALL_UNDO}`}</style><CallTables today /><CallTables today={false} /></div>,
    },
    {
      id: "one-page-band",
      name: "Before and after: ListBand at one page, and the held foot",
      intro: "At one page the narrow band drew its range between two hidden 44px arrows; now it draws the range on the gutter and the page size at the end, on one row. With keepFootRoom the foot holds its room at one page and draws nothing (no lone centred count). onePage=\"size\" shows the page size alone.",
      decisions: ["The wide form is unchanged; with a second page the pager returns and the count is centred between its arrows, as shipped.", "keepFootRoom stays opt-in (DECISIONS 227 removed the empty room under every short list).", "The Select is one element through every state, so it keeps focus when the page count crosses one.", NOT_REVIEWED],
      tryIt: ["At 390, choose a smaller page size: a second page brings the pager back and the select does not move."],
      widths: [1440, 390],
      touch: true,
      height: 760,
      demo: () => <div className="r75-pair"><style>{PAIR}</style><Bands today /><Bands today={false} /></div>,
    },
    {
      id: "wrap-cells",
      name: "A table cell that wraps",
      intro: "TableCell wrap and TableRowHead wrap: a column of sentences wraps whole and the row grows from its floor. The wrapped cell has the padding a one-line row has round its line, so one line is exactly the row in every density, and every cell keeps the middle alignment.",
      decisions: ["Only the wrap cell is padded, so a neighbour's badge cannot grow a one-line row.", "A wrap cell is never cut: no focus stop, no plate. numeric wins over wrap. Widths still come from the colgroup, so nothing moves on a sort or on toggling wrap.", "Guidance: every cell of a column or none; the remainder or at least 160; fixed forms never wrap.", NOT_REVIEWED],
      tryIt: ["Scroll the tables sideways at 390: the pinned row head is opaque over its grown height."],
      widths: [1440, 390],
      touch: true,
      height: 900,
      demo: () => <WrapCells />,
    },
    {
      id: "linked-rows",
      name: "A table row that opens what it names",
      intro: "TableRow linked: the row stays a tr and its link stays the one control. A plain primary press anywhere else on the row is handed to that link; a modified or middle click, a drag, a selection, a press on another control or on a cut cell keep theirs.",
      decisions: ["The opener is data-row-opener, else the first link or button in the row head, else the first link.", "The cells take the pointer cursor; hovering the row lifts the opener's underline; a press steps the row to the selected wash, a pinned cell as one colour. No chevron, no outline, no bar.", "Not shipped: a stretched link (its cover failed over the pinned cell and took selection and the cut cells' reading).", NOT_REVIEWED],
      tryIt: ["Click a loan's title: the loan opens. Command-click the loan's link: a new tab, as the browser does it. Select a member's name: nothing opens."],
      states: ["link-focus"],
      widths: [1440, 390],
      touch: true,
      height: 560,
      demo: ({ state }) => <LinkedRows state={state} />,
    },
    {
      id: "cut-text",
      name: "Cut text, read whole",
      intro: "Text lines cuts to one line or clamps to n, capped at n of the reader's own lines. While it is cut its whole text opens on the level-3 plate on hover, keyboard focus or a long press. Outside a control the text is its own stop; inside a link or a button the control is the stop and the plate opens from its hover and focus.",
      decisions: ["Without hover there is no plate inside a control: the text is whole at rest (the 390 shots).", "peek={false} only where pressing shows the whole text (the recipe card). A label that is cut and can be read nowhere else is a fault.", "Never a title and never a Tooltip; Text without lines runs no hook and loads nothing.", NOT_REVIEWED],
      tryIt: ["Tab to the description: the plate opens; Esc closes it and the text keeps its ring.", "Hover a file name for 600ms; a press on its plate follows the link."],
      states: ["peek-text", "peek-link", "forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 520,
      demo: ({ state }) => <CutText state={state} />,
    },
    {
      id: "panel-rows",
      name: "PanelRow: two targets, words that wrap, a static row",
      intro: "With actions the row is split: the title holds the row's link with a cover across the band, and each action is its own control above it. wrap lets the title and the description wrap. interactive={false} is a row with no target.",
      decisions: ["The trigger shows the band's -2 inset on its cover, so a split row and a one-target row look alike in focus; each action keeps its own ring at +2.", "From 480 of the list's width the actions are an end column after the trailing fact; under 480 a line of their own under the words, 44 tall on touch. The trailing fact is never hidden.", "A link in children sits above the cover, so a tap on its words follows it.", NOT_REVIEWED],
      tryIt: ["Hover the Call button: only it answers, the band shows no wash. Tab through: the row, then its actions."],
      states: ["trigger-focus", "action-focus", "forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 680,
      demo: ({ state }) => <PanelRows state={state} />,
    },
    {
      id: "panel-disclosures",
      name: "A DisclosureRow in a PanelList",
      intro: "Inside a PanelList a DisclosureRow is a band: space-3 by space-4, a divider between items, the full-bleed hover wash and the flush -2 ring, the first and last rows taking the panel's inner corners. Its type stays its own.",
      decisions: ["Option (a) of item 10: the band treatment, so a panel of mixed rows reads as one list.", "The detail is padded to the band's edges; the panel's clip is the room for a ring inside it.", NOT_REVIEWED],
      tryIt: ["Open the last row: its bottom corners give way to the detail."],
      states: ["row-focus"],
      widths: [1440, 390],
      touch: true,
      height: 560,
      demo: ({ state }) => <PanelDisclosures state={state} />,
    },
    {
      id: "sort-list",
      name: "Sorting a list",
      intro: "A list gets no column heads. The sort is a Select in FilterToolbar's sort slot, each option naming the field and the direction; sortLabel={false} drops the word beside it when the Select says it.",
      decisions: ["Rows that stay move by transform and keep their nodes, focus and open state; a sort returns to page 1; the app says the order once.", NOT_REVIEWED],
      tryIt: ["Choose Title A to Z: the rows move and an open row stays open."],
      widths: [1440, 390],
      touch: true,
      height: 420,
      demo: () => <SortedList />,
    },
    {
      id: "disclosures",
      name: "Disclosure in prose, and DisclosureList",
      intro: "Disclosure is a line in running text that opens: the chevron leads, the title wraps at the size it sits in, hover underlines it. DisclosureList is DisclosureRows as one ruled list on its parent's surface, each an li.",
      decisions: ["Disclosure is at least 28 tall, 44 on touch as real height; the ring at +2.", "In a DisclosureList a row is 40 (44 on touch) with no inline padding; a mark's seat is kept by every row; wrap rows are whole while closed.", "No loading API: a list that must land with no shift uses the default one-line rows.", NOT_REVIEWED],
      tryIt: ["Hover a prose disclosure: the chevron lifts and the title underlines."],
      states: ["prose-focus", "reduced-motion"],
      widths: [1440, 390],
      touch: true,
      height: 640,
      demo: ({ state }) => <Disclosures state={state} />,
    },
    {
      id: "notifications",
      name: "Notifications: the ringed dot, counts, wrap, reasons, loading and empty words",
      intro: "One dot means unread; a dot in a ring means unread and for you. A count on any entry draws ×N; wrap lets a page list's sentences wrap; an action that cannot run is off with its reason drawn; the first load is a shape of stand-in rows; empty words show once the list is known to be empty.",
      decisions: ["The ring is ink only, in every product, drawn as a border and a fill; it never moves or grows its seat.", "The centre's head keeps \"3 unread\" drawn and says \", 1 for you\"; the page list's head draws \"3 unread · 1 for you\".", "A refresh (loading with entries shown) changes nothing.", NOT_REVIEWED],
      tryIt: ["Open the bell: the reason sits under the head's row, from the band's start edge."],
      states: ["open", "loading", "forced-colours"],
      widths: [1440, 390],
      scales: [1, 2],
      touch: true,
      height: 760,
      demo: ({ state }) => <Notifications state={state} />,
    },
    {
      id: "tab-bar",
      name: "The tab bar's ringed dot",
      intro: "dotKind=\"direct\" on a TabBarItem rings its dot: new and addressed to the reader. The current page is still the filled glyph alone.",
      decisions: ["The words in dot say it (\"3 unread, 1 for you\").", NOT_REVIEWED],
      tryIt: ["Compare Messages (a plain dot) and Alerts (the ringed dot)."],
      states: ["forced-colours"],
      widths: [390],
      scales: [1, 2],
      touch: true,
      height: 320,
      demo: () => <Tabs />,
    },
  ],
};
