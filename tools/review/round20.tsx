// Round 20: display states. The council voted (DECISIONS 95, a three-member round the owner ordered; two of three deciding): the new-tab
// cue on links and Buttons, row headers and the "Not observed" cell and the scroll hint on the still table, the choice card, the pressed
// toggle, and the pending badge and the two-badge rule. This is that design built as decided. The design panel has not reviewed this
// implementation; neither has the owner.
//
// The states are real. "reduced-motion" and "forced-colours" are emulations build.mjs sets before the page loads. "hover" is a real
// pointer on the element that marks itself `data-wt-hover`; "focus" is real keyboard focus on the first choice card or toggle;
// "scrolled" scrolls the narrow table sideways. Everything here is synthetic.

import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Badge,
  BadgePair,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChoiceCard,
  ChoiceCardGroup,
  HomeGlyph,
  IconButton,
  Link,
  NotificationsGlyph,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  TableScrollHint,
  Text,
} from "../../packages/react/src/index";
import type { ControlSize, SortDirection } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

/**
 * Lets a demo shrink to the page. A table's `minWidth` (and a card grid's columns) is its content's minimum, which the walkthrough's
 * single-column grid would otherwise grow to, scrolling the whole page sideways at 390. A grid track of `minmax(0, 1fr)` has no
 * minimum, so a wide table scrolls inside its own container and the page fits.
 */
function Fit({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", width: "100%" }}>{children}</div>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- 1. links

const SIZES: ControlSize[] = ["xs", "sm", "md", "lg", "xl"];

function LinksDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      <Caption>In running text: the arrow comes from target="_blank" alone and sticks to the last word. A same-tab link to another site gets nothing.</Caption>
      <Text size="base" style={{ maxWidth: 520 }}>
        Rotate the keys before you deploy: the <Link href="https://docs.example.test/keys" target="_blank" data-wt-hover="">key rotation guide</Link> covers every
        region, and the <Link href="https://status.example.test">status page</Link> is a same-tab link to another site, so it has no arrow.
      </Text>
      <Caption>Beside text of 20px and up the arrow is 20px</Caption>
      <Text size="xl"><Link href="https://docs.example.test/keys" target="_blank">Key rotation guide</Link></Text>
      <Caption>In a narrow column (13.5rem): the arrow never starts a line alone</Caption>
      <Text size="sm" style={{ width: "13.5rem" }}>
        Read the <Link href="https://docs.example.test/rotate" target="_blank">key rotation guide for every region</Link> now, then the <Link href="https://docs.example.test/runbook" target="_blank">on-call runbook</Link>.
      </Text>
      <Caption>Buttons rendered as links, xs to xl: new tab (the arrow takes the trailing slot) and same tab</Caption>
      <div style={row}>
        {SIZES.map((size) => <Button key={size} size={size} render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Open console</Button>)}
      </div>
      <div style={row}>
        {SIZES.map((size) => <Button key={size} size={size} variant={size === "md" ? "primary" : "secondary"} render={<a href="https://console.example.test" />} nativeButton={false}>Open console</Button>)}
        <Button variant="ghost" render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Ghost</Button>
        <Button variant="primary" render={<a href="https://console.example.test" target="_blank" />} nativeButton={false}>Primary</Button>
      </div>
      <Caption>An IconButton that opens a new tab says so in its label and has no second glyph; a link that holds only a logo keeps the words and skips the arrow</Caption>
      <div style={row}>
        <IconButton icon={HomeGlyph} label="Open the home page" render={<a href="https://example.test" target="_blank" />} nativeButton={false} />
        <Link href="https://example.test" target="_blank" aria-label="Example"><span aria-hidden="true" style={{ display: "inline-block", width: 24, height: 24, borderRadius: 6, background: "var(--basalt-text-secondary)" }} /></Link>
      </div>
      <Caption>In a still-table cell: the label truncates and the arrow stays whole</Caption>
      <TableContainer style={{ maxWidth: 360 }}>
        <Table columns={[{ width: 120 }, {}]}>
          <TableHeader><TableRow><TableHead>Region</TableHead><TableHead>Runbook</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableRowHead>Frankfurt</TableRowHead><TableCell><Link href="https://docs.example.test/fra" target="_blank">Failover runbook for the Frankfurt cell</Link></TableCell></TableRow>
            <TableRow><TableRowHead>Sydney</TableRowHead><TableCell><Link href="https://docs.example.test/syd" target="_blank">Probe</Link></TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {state === "hover" ? <Caption>The pointer rests on the first link: the arrow lifts to the link's ink with the underline.</Caption> : null}
    </div>
  );
}

// ---- 2. the table

interface Reading {
  id: string;
  region: string;
  /** null is not observed; 0 is a reading of zero. */
  latency: number | null;
  errors: number | null;
  p95: number | null;
  uptime: number | null;
  /** "" is an empty note, which stays blank. */
  note: string;
}

const READINGS: Reading[] = [
  { id: "fra", region: "Frankfurt", latency: 128, errors: 0, p95: 212, uptime: 99.98, note: "Steady" },
  { id: "iad", region: "Virginia", latency: 94, errors: 3, p95: 180, uptime: 99.91, note: "One restart" },
  { id: "syd", region: "Sydney", latency: null, errors: null, p95: null, uptime: 99.7, note: "No probe in this window" },
  { id: "hnd", region: "Tokyo", latency: 96, errors: null, p95: 171, uptime: 99.95, note: "" },
  { id: "gru", region: "Sao Paulo", latency: 143, errors: 1, p95: 260, uptime: 99.88, note: "Steady" },
  { id: "lhr", region: "London", latency: 0, errors: 0, p95: 0, uptime: 100, note: "Idle" },
];

type Key = "region" | "latency" | "errors" | "p95" | "uptime" | "note";

/**
 * The sort the council decided (DECISIONS 95): a not-observed value (null) sorts after every observed value in BOTH directions, and an
 * empty string sorts after the observed values too, before the not-observed. Missing is not the smallest number.
 */
function sortReadings(rows: Reading[], key: Key, dir: SortDirection): Reading[] {
  const rank = (value: string | number | null) => (value === null ? 2 : value === "" ? 1 : 0);
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (rank(x) !== rank(y)) return rank(x) - rank(y);
    if (rank(x) !== 0) return a.id.localeCompare(b.id);
    const d = typeof x === "string" ? x.localeCompare(String(y)) : Number(x) - Number(y);
    return (dir === "ascending" ? d : -d) || a.id.localeCompare(b.id);
  });
}

const COLUMNS = [{ width: 148 }, { width: 132 }, { width: 132 }, { width: 132 }, { width: 132 }, {}];

function ReadingsTable({ pinned, selected, scroll }: { pinned?: boolean; selected: string; scroll?: boolean }) {
  const [sort, setSort] = React.useState<{ key: Key; dir: SortDirection | undefined }>({ key: "latency", dir: "descending" });
  const frame = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!scroll) return undefined;
    const timer = window.setTimeout(() => { if (frame.current) frame.current.scrollLeft = 200; }, 80);
    return () => window.clearTimeout(timer);
  }, [scroll]);
  // The third press is the table's own order (DECISIONS 261).
  const rows = sort.dir ? sortReadings(READINGS, sort.key, sort.dir) : READINGS;
  const head = (key: Key, label: string, numeric?: boolean) => (
    <TableHead numeric={numeric} sort={sort.key === key ? sort.dir : undefined} onSortChange={(dir) => setSort({ key, dir })}>{label}</TableHead>
  );
  const num = (value: number | null, suffix = "") => (value === null ? <TableCell numeric notObserved /> : <TableCell numeric>{value}{suffix}</TableCell>);
  return (
    <>
      <TableContainer ref={frame}>
        <Table columns={COLUMNS} minWidth={820} pinned={pinned ? 1 : undefined} aria-label="Probe readings by region">
          <TableHeader>
            <TableRow>
              {head("region", "Region")}
              {head("latency", "Latency ms", true)}
              {head("errors", "Errors", true)}
              {head("p95", "p95 ms", true)}
              {head("uptime", "Uptime %", true)}
              {head("note", "Note")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} selected={r.id === selected}>
                <TableRowHead>{r.region}</TableRowHead>
                {num(r.latency)}
                {num(r.errors)}
                {num(r.p95)}
                {num(r.uptime)}
                <TableCell>{r.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TableScrollHint />
    </>
  );
}

function TableDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 960 }}>
      <Caption>Row headers (500, on the row's own fill) and Not observed (tertiary, lifting on the hover and selected washes). Sydney was not probed; London reads zero; Tokyo's note is empty. Press a header: a not-observed value always sorts last, and a blank sorts after the observed values.</Caption>
      <div style={{ width: "100%" }}><ReadingsTable selected="iad" /></div>
      <Caption>At 390 (a 358px frame): still the table, pinned and scrolling, never cards, with the one-line hint under it</Caption>
      <div style={{ width: "min(358px, 100%)" }}><ReadingsTable pinned selected="iad" scroll={state === "scrolled"} /></div>
    </div>
  );
}

// ---- 3. cards

function CardsDemo({ state }: { state: string }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const [plan, setPlan] = React.useState("team");
  const [regions, setRegions] = React.useState<string[]>(["fra"]);
  React.useEffect(() => {
    if (state !== "focus") return undefined;
    const timer = window.setTimeout(() => stage.current?.querySelector<HTMLElement>("input:checked")?.focus({ focusVisible: true } as FocusOptions), 80);
    return () => window.clearTimeout(timer);
  }, [state]);
  const toggle = (id: string) => setRegions((all) => (all.includes(id) ? all.filter((r) => r !== id) : [...all, id]));
  const plans = (
    <ChoiceCardGroup aria-label="Plan">
      {[["starter", "Starter", "For trying it out", "Up to 3 projects"], ["team", "Team", "For a group that ships weekly", "Up to 20 projects"], ["scale", "Scale", "For many teams", "Unlimited projects"]].map(([value, title, description, line]) => (
        <ChoiceCard key={value} name="plan" value={value} title={title} description={description} checked={plan === value} onCheckedChange={() => setPlan(value!)}>
          <Text size="sm" tone="tertiary">{line}</Text>
        </ChoiceCard>
      ))}
    </ChoiceCardGroup>
  );
  return (
    <div style={{ ...col, maxWidth: 960 }} ref={stage}>
      <Caption>One of many (a native radio) on the page, level 1: the chosen card is the selected wash as one solid fill, its rim and title unchanged, and its box is the checked control</Caption>
      <div style={{ width: "100%", padding: 3 }}>{plans}</div>
      <Caption>Any of many (a native checkbox) inside a Card, level 2: the fill is that level's plate</Caption>
      <Card style={{ width: "100%" }}>
        <CardHeader><CardTitle>Regions</CardTitle></CardHeader>
        <CardContent>
          <ChoiceCardGroup multiple aria-label="Regions">
            {[["fra", "Frankfurt", "eu-central"], ["syd", "Sydney", "ap-southeast"], ["iad", "Virginia", "us-east"]].map(([id, title, description]) => (
              <ChoiceCard key={id} multiple name="region" value={id} title={title} description={description} checked={regions.includes(id!)} onCheckedChange={() => toggle(id!)} />
            ))}
          </ChoiceCardGroup>
          <Text size="sm" tone="secondary" style={{ marginTop: 12 }} role="status">{regions.length} of 3 regions selected</Text>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 4. toggles

function TogglesDemo({ state }: { state: string }) {
  const stage = React.useRef<HTMLDivElement>(null);
  const [on, setOn] = React.useState({ mute: true, pin: false, alerts: true, home: false, mark: true });
  React.useEffect(() => {
    if (state !== "focus") return undefined;
    const timer = window.setTimeout(() => stage.current?.querySelector<HTMLElement>("button[aria-pressed]")?.focus({ focusVisible: true } as FocusOptions), 80);
    return () => window.clearTimeout(timer);
  }, [state]);
  const flip = (key: keyof typeof on) => () => setOn((all) => ({ ...all, [key]: !all[key] }));
  return (
    <div style={{ ...col, maxWidth: 760 }} ref={stage}>
      <Caption>Text toggles: a 16px seat at the label's start holds the check while pressed, so pressed and unpressed are one width. Secondary, then ghost. Primary and danger do not toggle.</Caption>
      <div style={row}>
        <Button aria-pressed={on.mute} onClick={flip("mute")}>Mute thread</Button>
        <Button aria-pressed={!on.mute} onClick={flip("mute")}>Mute thread</Button>
        <Button variant="ghost" aria-pressed={on.pin} onClick={flip("pin")}>Pin to top</Button>
        <Button variant="ghost" aria-pressed={!on.pin} onClick={flip("pin")}>Pin to top</Button>
      </div>
      <Caption>Icon toggles carry no check: the plate, the ink step and the glyph's selected form (a core glyph closes and fills; a fillSafe Phosphor glyph fills)</Caption>
      <div style={row}>
        <Button variant="secondary" icon={NotificationsGlyph} pressed={on.alerts} onClick={flip("alerts")}>Alerts</Button>
        <Button variant="ghost" icon={NotificationsGlyph} pressed={!on.alerts} onClick={flip("alerts")}>Alerts</Button>
        <IconButton variant="secondary" icon={HomeGlyph} label="Home" pressed={on.home} onClick={flip("home")} />
        <IconButton variant="secondary" icon={HomeGlyph} label="Home" pressed={!on.home} onClick={flip("home")} />
        <IconButton icon={NotificationsGlyph} label="Alerts" pressed={on.alerts} onClick={flip("alerts")} />
        <IconButton icon={BookmarkSimpleIcon} fillSafe label="Bookmark" pressed={on.mark} onClick={flip("mark")} />
        <IconButton icon={BookmarkSimpleIcon} fillSafe label="Bookmark" pressed={!on.mark} onClick={flip("mark")} />
      </div>
      <Caption>On a card (level 1, the Card on the page): the plate is that level's</Caption>
      <Card style={{ width: "100%" }}>
        <CardContent>
          <div style={row}>
            <Button aria-pressed={on.mute} onClick={flip("mute")}>Mute thread</Button>
            <Button variant="ghost" aria-pressed={on.pin} onClick={flip("pin")}>Pin to top</Button>
            <IconButton variant="secondary" icon={HomeGlyph} label="Home" pressed={on.home} onClick={flip("home")} />
            <Button variant="primary">Not a toggle</Button>
            <Button variant="danger">Not a toggle</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 5. badges

function BadgesDemo() {
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      <Caption>Pending is a hollow 6px ring in the word's ink, in the status dot's seat, beside filled dots and braille. The ring needs none of them.</Caption>
      <div style={row}>
        <Badge status="pending">Pending</Badge>
        <Badge status="pending">In review</Badge>
        <Badge status="pending">Queued</Badge>
        <Badge status="success">Ready</Badge>
        <Badge status="warning">Waiting 4 days</Badge>
        <Badge status="danger">Failed</Badge>
        <Badge>Demo</Badge>
      </div>
      <div style={{ ...row, gap: 16 }}>
        <Badge status="pending" variant="plain">Queued</Badge>
        <span style={{ ...row, gap: 6, fontSize: 13 }}><Spinner variant="braille" />Building</span>
        <Badge status="success" variant="plain">Ready</Badge>
      </div>
      <Caption>Two badges on one object: the status first, then one neutral fact, 8px apart and 8px after the name</Caption>
      <BadgePair name={<Text as="span" size="base" weight="medium">billing-worker</Text>} status={<Badge status="pending">In review</Badge>} fact={<Badge>Demo</Badge>} />
      <BadgePair name={<Text as="span" size="base" weight="medium">sleep-trends</Text>} status={<Badge status="success">Ready</Badge>} fact={<Badge>Synthetic data</Badge>} />
      <Caption>When the name and the pair don't fit on one line the pair moves under the name as a unit, and a badge never truncates (a 262px column)</Caption>
      <div style={{ width: 262 }}>
        <BadgePair name={<Text as="span" size="base" weight="medium">sleep-trends-weekly-summary</Text>} status={<Badge status="pending">In review</Badge>} fact={<Badge>Synthetic data</Badge>} />
      </div>
      <div style={{ width: "min(358px, 100%)" }}>
        <BadgePair name={<Text as="span" size="base" weight="medium">report-builder-107-with-a-long-name</Text>} status={<Badge status="warning">Checks failing</Badge>} fact={<Badge>Staging</Badge>} />
      </div>
    </div>
  );
}

export const ROUND_20: Round = {
  id: "20",
  title: "Display states: links, tables, cards, toggles and badges",
  reviewed: false,
  summary:
    "The council voted (DECISIONS 95, a three-member round the owner ordered; two of three deciding). A link or Button that opens a new tab draws the external arrow and says so, automatically. The still table gains row headers, a \"Not observed\" cell and a scroll hint. A choice card is a native radio or checkbox wearing a card; a toggle Button takes the selected plate and a check. Pending is a hollow ring, and an object carries at most two badges. This is the decided design built; neither the design panel nor the owner has reviewed this implementation.",
  steps: [
    {
      id: "links",
      name: "New-tab links",
      intro: "The arrow means \"opens in a new tab\" and nothing else. It appears, and \"(opens in a new tab)\" is spoken, exactly when the target opens one: on Link and on a Button rendered as a link.",
      decisions: [
        "Automatic from target=\"_blank\", with no prop and no opt-out (decided 2 to 1; Sol wanted a prop for leaving the product). A same-tab link to another site gets nothing.",
        "The glyph is the core external, after the label, aria-hidden, never underlined: 16px beside 12 to 16px text and in Buttons xs to lg, 20px beside text of 20px and up and in an xl Button, where it takes the trailing slot at the button's own gap. A new-tab Button has no other trailing icon.",
        "In running text it adds no space: the glyph's own side bearing, a word joiner and nowrap keep it with the last word, so it never starts a line. In a still-table cell the label truncates and the arrow stays whole.",
        "Ink (decided 2 to 1; Grok wanted the label's own ink): secondary at rest, lifting to the link's primary with the underline on hover and focus; in a Button, the Button's own ink. LinkText or ButtonText in forced colours, through currentColor.",
        "Spoken: a visually hidden \" (opens in a new tab)\" after the label, one translatable string. An IconButton gets it in its label and no second glyph. A link that holds only a logo skips the glyph and keeps the phrase.",
        "Open for the owner: Base UI gives a Button rendered with nativeButton={false} role=\"button\", so a Button anchor is announced as a button, not a link (as it already was).",
      ],
      tryIt: ["Hover and Tab to the first link: the arrow lifts with the underline.", "Narrow the window: the arrow wraps with the last word.", "Switch to forced colours: the arrow is LinkText in a link and the Button's own colour in a Button."],
      states: ["hover", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <Fit><LinksDemo state={state} /></Fit>,
    },
    {
      id: "table",
      name: "Table additions",
      intro: "A th scope=\"row\" names each row in the row's own type. A cell with no reading says \"Not observed\". A table wider than its container says so, once, in a line under it.",
      decisions: [
        "Row headers (3 to 0): 13/18 at 500, primary, start-aligned, with the cell's height, padding and divider, on the row's own fill so the washes run through it, with no band. They don't sort. Pinned, the row header is the pinned column and is opaque in every state. (Muse's prototype painted it with the column band; that was not copied.)",
        "Not observed (3 to 0 for the words; 2 to 1 for tertiary ink, lifting to secondary on the hover and selected washes; 2 to 1 for no mark, where Opus wanted a 12px hatch swatch): no mark, no dash. In a numeric column the words end on the numbers' edge. Zero stays the digit in primary, and an empty string stays blank.",
        "Sorting (app guidance; Basalt's Table doesn't sort): a not-observed value sorts after every observed value in both directions, and an empty string sorts after the observed values too. This page's table sorts that way.",
        "Narrow tables stay the still table: pin and scroll, never cards, never a hidden column. The scroll hint (3 to 0) is one line, 12/16 tertiary and aria-hidden, shown only while the table overflows and never changed while it scrolls. A test measures every header at 0px when the hint appears.",
        "Open for the owner: a column that can hold the words must be wide enough for them (112px at 13px), a decision the app makes when it designs the table.",
      ],
      tryIt: ["Sort Latency both ways: Sydney's empty cell stays last, and Tokyo's blank note sorts after the observed notes.", "Hover a row: Not observed lifts to secondary.", "Scroll the narrow table: the row header stays, its divider shows, the hint does not change."],
      states: ["scrolled", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <Fit><TableDemo state={state} /></Fit>,
    },
    {
      id: "cards",
      name: "The choice card",
      intro: "A native radio or checkbox wearing a card. The whole card is clickable; a real choice box sits on the header line, in a seat every choice card reserves.",
      decisions: [
        "Decided 2 to 1 (Grok wanted tiles in a track for one of many): the selected wash as one solid fill at the card's own level, a real Radio or Checkbox box in a reserved seat, the rim and the level unchanged. Plain Card gets no selected prop.",
        "The title stays primary with no weight change; tertiary content steps to secondary on the fill. Hover on an unselected card is the hover wash alone, with nothing further on a selected one. No press scale. Focus is the control ring at +2 outside the card. State changes crossfade over 100ms, the same under reduced motion.",
        "Forced colours: the wash drops, the card keeps Canvas with a CanvasText edge, and the checked box is Highlight with HighlightText.",
        "Open for the owner: the group's space-4 gap keeps each ring clear of its neighbours; the app must keep at least space-1-5 to any clipping edge. A card with interactive content inside it (a link) would sit under the label, so the card is for choosing, not for holding controls.",
      ],
      tryIt: ["Click anywhere on a card, then press the arrow keys: the radios are one native group.", "Tab to a card: the ring is outside it.", "Switch the theme: in light the chosen card is the one grey card among white ones."],
      states: ["focus", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <Fit><CardsDemo state={state} /></Fit>,
    },
    {
      id: "toggles",
      name: "The pressed toggle",
      intro: "A secondary or ghost Button, or an IconButton, with aria-pressed: the selected plate, primary ink and a check; an icon toggle uses its glyph's selected form.",
      decisions: [
        "Decided 2 to 1 (Opus wanted the held wash and the glyph's selected form, with a text-only on/off as a Switch): the selected plate as one solid fill per level, the label up to primary with no weight change, a secondary's hairline to border-hover, a ghost gaining its rectangle, the radius unchanged.",
        "A 16px seat at the label's start holds the check while pressed and is empty while not: pressed and unpressed are one width (a test measures it). The check swaps, it does not morph. An icon toggle and every IconButton toggle carry no check.",
        "Only secondary, ghost and IconButton toggle (3 to 0); primary and danger do not. The momentary .98 press stays Button's. Forced colours are Highlight with HighlightText for the fill, the label and the check, after interaction and hovered as well as on first render. (Opus's prototype kept a grey fill after a click; that was not copied.)",
        "Open for the owner: on the page (level 0) there is no plate of its own, so a toggle there takes level 1's recipe over surface-1 (the next level plus the wash in dark). This follows the plate rule mechanically; no level-0 plate was drawn.",
      ],
      tryIt: ["Press a toggle: the label does not move.", "Tab to a toggle: the ring is the control ring at +2.", "Press and hold a pressed toggle: it scales to .98 and keeps its plate."],
      states: ["focus", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <Fit><TogglesDemo state={state} /></Fit>,
    },
    {
      id: "badges",
      name: "Badges",
      intro: "Pending is a hollow ring in the word's ink. An object carries at most two badges: the status, then one neutral fact.",
      decisions: [
        "Pending (3 to 0): a hollow 6px ring in the badge word's ink, in the status dot's seat, with the app's word. aria-hidden; the word is spoken. The same mark works in the plain variant, and it survives forced colours as a CanvasText border. It does not depend on any filled dot (those vanish in forced colours today, which is batch 7's item).",
        "The ring's stroke was decided in a short follow-up vote (round 2, 2 of 3): a 1px border in size-hairline.",
        "Two badges (3 to 0): the status first, right after the name, then one neutral fact, 8px apart and 8px after the name. Never two statuses; a third fact goes in words. When the name and the pair don't fit on one line the pair moves under the name as a unit, and a badge never truncates. Spoken in DOM order.",
      ],
      tryIt: ["Resize to 390: the pair drops under a long name as one unit.", "Switch to forced colours: the ring stays; the filled dots beside it are the known D7 gap."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <Fit><BadgesDemo /></Fit>,
    },
  ],
};
