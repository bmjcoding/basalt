// Round 54: loading in the page's own shape (skeleton-shape: DECISIONS 247, 248, 249b and 258). Decided by Opus and approved by the owner; the implementation is
// reviewed by Astra. Two synthetic pages drawn from Basalt's parts with `LoadingShape` and no CIMIP code: a list (a header, a count, a still table) and a detail
// page (a header, facts, a stream). States: the full shape (nothing known), the prefill (what is known shown, the rest bones), the phases mid-way (the facts
// landed, the stream still loading), a last copy with "Updating", and loaded (the default). Each in both themes at 1440 and 390, plus forced colours and reduced
// motion. A held state never finishes loading, so its bones stay on screen for the shot; the default state has a button that plays the load from the start.

import * as React from "react";

import {
  Avatar,
  Badge,
  Button,
  DescriptionItem,
  DescriptionList,
  Heading,
  LoadingShape,
  Refreshing,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  fillIn,
  standIn,
  useStaged,
} from "../../packages/react/src/index";
import type { StandInVariant } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");
const page: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-6)", maxWidth: "var(--basalt-size-page-width)", margin: "0 auto", padding: "var(--basalt-space-8) var(--basalt-gutter)" };
const head: React.CSSProperties = { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--basalt-space-4)", flexWrap: "wrap" };
const actions: React.CSSProperties = { display: "flex", alignItems: "center", gap: "var(--basalt-space-3)" };

// ---- The list ----

interface Row { ref: string; title: string; severity: string; status: string; commander: string; declared: string }
const ROWS: Row[] = [
  { ref: "SYN-0412", title: "Checkout timing out for some customers", severity: "SEV1", status: "Investigating", commander: "Dana Okafor", declared: "09:12" },
  { ref: "SYN-0409", title: "Payments API latency after the 14:05 deploy", severity: "SEV2", status: "Mitigating", commander: "Lee Marsh", declared: "08:47" },
  { ref: "SYN-0407", title: "Search results missing for new listings", severity: "SEV2", status: "Identified", commander: "Priya Nair", declared: "08:30" },
  { ref: "SYN-0401", title: "Login retries failing in one region", severity: "SEV3", status: "Monitoring", commander: "Sam Kowalski", declared: "07:58" },
  { ref: "SYN-0398", title: "Order emails delayed by the queue", severity: "SEV3", status: "Investigating", commander: "Ana Ruiz", declared: "07:21" },
  { ref: "SYN-0390", title: "Mobile app cache serving stale prices", severity: "SEV4", status: "Monitoring", commander: "Chris Bell", declared: "06:40" },
];
const STATUS_OF: Record<string, "danger" | "warning" | "neutral"> = { SEV1: "danger", SEV2: "warning", SEV3: "neutral", SEV4: "neutral" };

/** Stand-in rows: other words, other severities, another hour and one more row in the unseen variant, so every value and count differs. */
const standInRows = (variant: StandInVariant): Row[] =>
  Array.from({ length: ROWS.length + variant }, (_, i) => ({
    ref: variant === 0 ? `SYN-${String(100 + i).padStart(4, "0")}` : `SYN-${String(9000 + i)}`,
    title: standIn(10 + i, 34 + (i % 3) * 6, variant),
    severity: variant === 0 ? (i % 2 ? "SEV1" : "SEV2") : (i % 2 ? "SEV3" : "SEV4"),
    status: standIn(30 + i, 11, variant),
    commander: standIn(40 + i, 12, variant),
    declared: variant === 0 ? `0${i}:1${i}` : `1${i}:5${i}`,
  }));

function ListBody({ rows }: { rows: Row[] }) {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-3)" }}>
      <Text size="sm" tone="secondary">Showing {rows.length} of {rows.length} incidents</Text>
      <TableContainer label="Active incidents">
        <Table minWidth={760}>
          <TableHeader>
            <TableRow><TableHead>Incident</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Commander</TableHead><TableHead>Declared</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref}>
                <TableCell><Text as="span" size="xs" tone="secondary" mono>{row.ref}</Text> <Text as="span" size="sm">{row.title}</Text></TableCell>
                <TableCell><Badge status={STATUS_OF[row.severity]}>{row.severity}</Badge></TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell><span style={{ display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-2)" }}><Avatar name={row.commander} size={24} />{row.commander}</span></TableCell>
                <TableCell>{row.declared}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function ListPage({ state }: { state: string }) {
  const kind = kindOf(state);
  const [run, setRun] = React.useState(0);
  const [arrived, setArrived] = React.useState(kind === "default" || kind === "refreshing");
  React.useEffect(() => {
    if (!run) return undefined;
    setArrived(false);
    const timer = window.setTimeout(() => setArrived(true), 1500);
    return () => window.clearTimeout(timer);
  }, [run]);
  const loading = kind === "full" || kind === "prefill" || !arrived;
  const refreshing = kind === "refreshing";
  return (
    <div style={page}>
      <div style={head}>
        <div style={{ display: "grid", gap: "var(--basalt-space-1)" }}>
          <Heading level={1} size="2xl">Incidents</Heading>
          <Text size="sm" tone="secondary">Every active incident, most severe first.</Text>
        </div>
        <div style={actions}>
          <Refreshing on={refreshing} />
          <Button variant="secondary" onClick={() => setRun((n) => n + 1)}>Play the load</Button>
          <Button variant="primary">Declare</Button>
        </div>
      </div>
      <LoadingShape
        key={run}
        loading={loading}
        refreshing={refreshing}
        label="Loading incidents"
        {...(kind === "full" ? { shape: () => <ListBody rows={standInRows(0)} /> } : { prefill: (variant: StandInVariant) => <ListBody rows={standInRows(variant)} /> })}
      >
        {() => <ListBody rows={ROWS} />}
      </LoadingShape>
    </div>
  );
}

// ---- The detail page ----

interface Message { author: string; at: string; text: string }
interface Room {
  incident: { ref: string; title: string; severity: string; status: string; commander: string; declared: string };
  people: { deputy: string; application: string; here: string };
  stream: Message[];
}
const ROOM: Room = {
  incident: { ref: "SYN-0412", title: "Checkout timing out for some customers", severity: "SEV1", status: "Investigating", commander: "Dana Okafor", declared: "09:12" },
  people: { deputy: "Lee Marsh", application: "Checkout web", here: "6 here now" },
  stream: [
    { author: "Dana Okafor", at: "09:12", text: "Declared. Checkout is timing out for about one in twenty customers since the deploy." },
    { author: "Lee Marsh", at: "09:15", text: "Payments API latency is up. The error rate is elevated on the worker pool." },
    { author: "Priya Nair", at: "09:21", text: "Rolling back the worker change now. I will post when it is out." },
    { author: "Dana Okafor", at: "09:30", text: "Rollback is out. Watching the error rate for ten minutes before we call it mitigated." },
  ],
};
/** What the list already knows: the incident itself. */
const KNOWN = { incident: ROOM.incident };
/** Stand-ins for the rest: other words, another hour and one more entry in the unseen variant. */
const standInRoom = (variant: StandInVariant): Room => ({
  incident: { ref: standIn(1, 8, variant), title: standIn(2, 38, variant), severity: variant === 0 ? "SEV1" : "SEV4", status: standIn(3, 12, variant), commander: standIn(4, 12, variant), declared: variant === 0 ? "01:01" : "23:59" },
  people: { deputy: standIn(5, 11, variant), application: standIn(6, 12, variant), here: variant === 0 ? "2 here now" : "9 here now" },
  stream: Array.from({ length: 4 + variant }, (_, i) => ({ author: standIn(20 + i, 12, variant), at: variant === 0 ? `0${i}:0${i}` : `1${i}:4${i}`, text: standIn(30 + i, 70 + (i % 2) * 30, variant) })),
});

function Facts({ room }: { room: Room }) {
  const { incident, people } = room;
  return (
    <DescriptionList>
      <DescriptionItem term="Severity"><Badge status={STATUS_OF[incident.severity]}>{incident.severity}</Badge></DescriptionItem>
      <DescriptionItem term="Status">{incident.status}</DescriptionItem>
      <DescriptionItem term="Commander">{incident.commander}</DescriptionItem>
      <DescriptionItem term="Deputy">{people.deputy}</DescriptionItem>
      <DescriptionItem term="Application">{people.application}</DescriptionItem>
      <DescriptionItem term="Declared">{incident.declared}</DescriptionItem>
    </DescriptionList>
  );
}

function Stream({ room }: { room: Room }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--basalt-space-4)" }}>
      {room.stream.map((message, i) => (
        <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--basalt-space-3)" }}>
          <Avatar name={message.author} size={32} />
          <div style={{ display: "grid", gap: "var(--basalt-space-1)" }}>
            <Text as="div" size="sm"><span style={{ fontWeight: "var(--basalt-font-weight-medium)" }}>{message.author}</span> <Text as="span" size="xs" tone="tertiary">{message.at}</Text></Text>
            <Text size="sm" tone="secondary">{message.text}</Text>
          </div>
        </li>
      ))}
    </ol>
  );
}

const section: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-3)", alignContent: "start" };

function DetailPage({ state }: { state: string }) {
  const kind = kindOf(state);
  const [run, setRun] = React.useState(0);
  const [at, setAt] = React.useState({ people: kind !== "full" && kind !== "prefill", stream: kind === "default" || kind === "refreshing" });
  React.useEffect(() => {
    if (!run) return undefined;
    setAt({ people: false, stream: false });
    const people = window.setTimeout(() => setAt((a) => ({ ...a, people: true })), 700);
    const stream = window.setTimeout(() => setAt((a) => ({ ...a, stream: true })), 1500);
    return () => { window.clearTimeout(people); window.clearTimeout(stream); };
  }, [run]);
  const landed = useStaged(at);
  const refreshing = kind === "refreshing";
  const full = kind === "full";
  const known = full ? null : KNOWN;
  const title = known ? <Heading level={1} size="2xl">{ROOM.incident.title}</Heading> : <span />;
  return (
    <div style={page}>
      <div style={head}>
        <div style={{ display: "grid", gap: "var(--basalt-space-1)", minHeight: "var(--basalt-size-control-3xl)" }}>
          <Text size="xs" tone="secondary" mono>{known ? ROOM.incident.ref : ""}</Text>
          {title}
        </div>
        <div style={actions}>
          <Refreshing on={refreshing} />
          <Button variant="secondary" onClick={() => setRun((n) => n + 1)}>Play the load</Button>
          <Button variant="primary">Publish update</Button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))", gap: "var(--basalt-space-8)", alignItems: "start" }}>
        <section style={section} aria-label="Facts">
          <Heading level={2} size="md">Facts</Heading>
          <LoadingShape key={`f${run}`} loading={!landed.people} refreshing={refreshing} label="Opening the incident"
            {...(full ? { shape: () => <Facts room={standInRoom(0)} /> } : { prefill: (variant: StandInVariant) => <Facts room={fillIn(known, standInRoom(variant))} /> })}>
            {() => <Facts room={ROOM} />}
          </LoadingShape>
        </section>
        <section style={section} aria-label="Stream">
          <Heading level={2} size="md">Stream</Heading>
          <LoadingShape key={`s${run}`} loading={!(landed.people && landed.stream)} refreshing={refreshing}
            {...(full ? { shape: () => <Stream room={standInRoom(0)} /> } : { prefill: (variant: StandInVariant) => <Stream room={fillIn(known, standInRoom(variant))} /> })}>
            {() => <Stream room={ROOM} />}
          </LoadingShape>
        </section>
      </div>
    </div>
  );
}

const STATES = ["full", "prefill", "phases", "refreshing", "prefill-forced-colours", "prefill-reduced-motion"];
const SHOT = { widths: [1440, 390], scales: [2], bleed: true, touch: true };
const DECISIONS = [
  "A view's loading state is the view itself: the same components with stand-in data, painted as bones measured from the drawing. A line is one bar per line, 0.75 of its text's size; a filled control or a mark is a bone in its own box and radius; an icon is hidden, its seat kept; structure (rims, dividers, a table's head band) is drawn as it is.",
  "Known words stay words: a table's column heads and the names of tabs (KEEP), in every state.",
  "Prefill: the region is drawn twice with two different fillings of what is unknown, and what comes out the same in both, in its words and its place, is drawn as itself. Only what isn't known is a bone, field by field.",
  "Timing: no bone before 300ms from the page's start, at least 400ms once shown, and the content takes the shape's place at once while the last bones fade out over it (opacity only). One polite “Loading” for the page.",
  "Phases (useStaged): parts arriving within 250ms land together; a region lands only with every part it reads, top-down, so nothing that has landed moves.",
  "A last copy stays content while it is fetched again, and “Updating” (braille and its word, tertiary ink) shows after a second in a seat kept for it.",
  "Forced colours: what is known is drawn as itself and each bone is a 1px ButtonBorder edge. Reduced motion and the hold: the bones stand still at full strength.",
  "Decided by Opus and approved by the owner (DECISIONS 247, 248, 249b and 258). The implementation is reviewed by Astra. React's alone: the HTML skill has no loading shape.",
];

export const ROUND_54: Round = {
  id: "54",
  title: "Loading in the page's own shape: LoadingShape, the prefill, phases, a last copy, the reload rule (DECISIONS 247, 248, 249b, 258)",
  reviewed: false,
  summary:
    "Built from Opus's skeleton-shape prototype, which the owner approved (DECISIONS 258); the implementation is reviewed by Astra. Two synthetic pages drawn from Basalt's parts with no CIMIP code: a list and a detail page, each as the full shape (nothing known), the prefill (what is known shown, the rest bones), the phases mid-way (the detail page's facts landed, its stream still loading), a last copy with “Updating”, and loaded. Both themes, 1440 and 390, forced colours and reduced motion. “Play the load” runs it live. Two fixes found on the way: a form dialog no longer slides down half its height as it opens (under reduced motion it only fades), and a tab switch is one change (the panel left goes at once).",
  steps: [
    {
      id: "list",
      name: "A list page",
      intro: "A header, a count and a still table of incidents. Nothing about the rows is known until they arrive, so the count and every row are bones; the page's words, the buttons and the column heads are drawn as themselves.",
      decisions: DECISIONS,
      tryIt: ["Press “Play the load”: the structure and the known words hold still, bones appear at 300ms, and the rows land where their bones were.", "Turn on reduced motion: the bones stand still."],
      states: STATES.filter((s) => s !== "phases"),
      ...SHOT,
      height: 900,
      demo: ({ state }) => <ListPage state={state} />,
    },
    {
      id: "detail",
      name: "A detail page",
      intro: "Opened from the list: the incident's reference, title, severity, status, commander and declared time are known at once. The deputy, the application and the stream are bones until they arrive, in two phases.",
      decisions: DECISIONS,
      tryIt: ["Press “Play the load”: the facts land at 700ms, then the stream at 1500ms; nothing that has landed moves.", "Compare “full” with “prefill”: the known facts are words in one and bones in the other."],
      states: STATES,
      ...SHOT,
      height: 900,
      demo: ({ state }) => <DetailPage state={state} />,
    },
  ],
};
