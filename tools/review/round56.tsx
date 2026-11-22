// Round 56: the conversation stream (cimip-gaps-2, batch B2). Decided and built by Opus on the no-council path (DECISIONS 226 and 265); Astra reviews the
// code and the lead checks the pixels; the owner sees these pictures before merge. Every part is shown in at least two unlike domains, with synthetic
// people and data only: a team's chat, a support thread, a shared document's comments, a help assistant's answer, a build pipeline and a contacts import.
// Lead renumbers at merge if another batch took 56.

import { FileTextIcon, GitBranchIcon, MagnifyingGlassIcon, TagIcon, UserPlusIcon, WrenchIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  ActivityList,
  ActivityStep,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DisclosureRow,
  EventLogRule,
  Heading,
  Icon,
  LoadingShape,
  LogLine,
  Presence,
  Spinner,
  Stream,
  StreamArrivedWord,
  StreamBlock,
  StreamEntry,
  StreamMessage,
  StreamNote,
  StreamQuote,
  Text,
  fillIn,
  standIn,
} from "../../packages/react/src/index";
import type { StandInVariant } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");
const page: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-8)", maxWidth: "var(--basalt-size-page-width)", margin: "0 auto", padding: "var(--basalt-space-8) var(--basalt-gutter)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 30rem), 1fr))", alignItems: "start" };
const column: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-4)", alignContent: "start", minWidth: 0 };
const caption = (domain: string, title: string) => (
  <div style={{ display: "grid", gap: "var(--basalt-space-0-5)" }}>
    <Text size="xs" tone="tertiary">{domain}</Text>
    <Heading level={2} size="md">{title}</Heading>
  </div>
);
// A fixed "now" so every duration is the same in every shot: Nov 18, 2026, 3:00 PM UTC.
const NOW = Date.UTC(2026, 10, 18, 15, 0);
const min = (n: number) => NOW - n * 60000;

// ---- Messages, notes, joined runs ----

function TeamChat() {
  return (
    <Stream label="Design review channel">
      <EventLogRule>Today</EventLogRule>
      <StreamNote mark={<Icon icon={UserPlusIcon} size={16} />} time="9:02 AM">Mina Sato joined the channel</StreamNote>
      <StreamMessage author="Theo Park" time="9:04 AM">
        <p>Morning. The new onboarding screens are in the shared file, on page 3.</p>
      </StreamMessage>
      <StreamMessage author="Theo Park" time="9:05 AM" joined>
        <p>Comments welcome before the 2 PM review.</p>
      </StreamMessage>
      <StreamMessage author="Mina Sato" time="9:11 AM" meta={<Presence status="active" now={NOW} />}>
        <p>Looked at them. The second screen reads better with the button at the bottom, where a thumb reaches it.</p>
      </StreamMessage>
      <StreamMessage author="Rosa Lind" time="9:20 AM" meta={<Presence status="away" since={min(6)} now={NOW} />}>
        <p>Agreed. I am in a workshop until noon and will leave notes in the file after it.</p>
      </StreamMessage>
    </Stream>
  );
}

function SupportThread() {
  return (
    <Stream label="Ticket 4821">
      <StreamMessage author="Jules Ferreira" time="Nov 18, 4:12 PM">
        <p>Exporting invoices as CSV gives me an empty file since yesterday. Nothing else changed on our side.</p>
      </StreamMessage>
      <StreamNote mark={<Icon icon={TagIcon} size={16} />} time="4:13 PM">Assigned to Ada Brooks</StreamNote>
      <StreamMessage author="Ada Brooks" time="4:20 PM" meta={<Badge variant="plain" status="neutral">Support</Badge>}>
        <p>Thanks, Jules. Which date range did you choose, and is it the same for every client?</p>
      </StreamMessage>
      <StreamMessage author="Jules Ferreira" time="4:31 PM">
        <p>October 1 to 31, and yes, every client.</p>
      </StreamMessage>
      <StreamMessage author="Jules Ferreira" time="4:32 PM" joined>
        <p>A single week works.</p>
      </StreamMessage>
      <StreamNote time="4:40 PM">Status set to Waiting on engineering</StreamNote>
    </Stream>
  );
}

// ---- The other side of an exchange ----

function AssistantAnswer() {
  return (
    <Stream label="Help assistant">
      <StreamMessage author="Help assistant" time="10:02 AM" meta={<Badge variant="plain">Automated</Badge>}>
        <StreamQuote cite="Jules Ferreira asked" time="10:02 AM">Why is my CSV export empty when I choose a whole month?</StreamQuote>
        <p>Exports of more than 5,000 rows are written in parts, and the first part was sent empty yesterday. A fix is rolling out; a single week exports whole in the meantime.</p>
      </StreamMessage>
    </Stream>
  );
}

function DocComments() {
  return (
    <Stream label="Comments on section 2">
      <StreamMessage author="Theo Park" time="Mon 3:15 PM">
        <p>Should the pricing table come before the plan names? Readers compare prices first.</p>
      </StreamMessage>
      <StreamMessage author="Mina Sato" time="Mon 4:02 PM">
        <StreamQuote cite="Replying to Theo Park">Readers compare prices first.</StreamQuote>
        <p>Our interviews say the opposite for small teams: they pick the plan by its limits. I would keep the names first.</p>
      </StreamMessage>
    </Stream>
  );
}

// ---- Disclosure rows ----

function AssistantWork({ open }: { open: boolean }) {
  return (
    <Stream label="Research assistant">
      <StreamMessage author="Research assistant" time="11:40 AM">
        <div style={{ display: "grid" }}>
          <DisclosureRow defaultOpen={open} mark={<Icon icon={MagnifyingGlassIcon} size={16} />} title="Searched the help center for “CSV export limit”" meta="0.8 s">
            <p>Four articles matched. The newest, from Nov 2, says exports are written in parts of 5,000 rows.</p>
          </DisclosureRow>
          <DisclosureRow mark={<Icon icon={FileTextIcon} size={16} />} title="Read “How exports are built” and the status page for the export service, including the notes for every outage in the last thirty days" meta="2.1 s">
            <p>The status page lists one open issue: the first part of a split export is empty.</p>
          </DisclosureRow>
          <DisclosureRow mark={<Spinner variant="braille" size={16} label="Running" />} title="Comparing the article with the open issue">
            <p>Still running.</p>
          </DisclosureRow>
        </div>
        <p>Exports over 5,000 rows are split, and the first part is empty until the fix ships.</p>
      </StreamMessage>
    </Stream>
  );
}

function BuildLog({ open }: { open: boolean }) {
  return (
    <div style={{ display: "grid" }}>
      <DisclosureRow defaultOpen={open} mark={<Icon icon={WrenchIcon} size={16} />} title="Installed 214 packages" meta="12 s">
        <div><LogLine fields={[{ text: "added", loud: true }, " 214 packages from 1 lockfile in 11.8s"]} /><LogLine fields={["2 packages are looking for funding"]} /></div>
      </DisclosureRow>
      <DisclosureRow mark={<Icon icon={GitBranchIcon} size={16} />} title="Checked out main at 4f2c9e1" meta="0.4 s">
        <LogLine fields={["HEAD is now at ", { text: "4f2c9e1", loud: true }, " Move the export limit into settings"]} />
      </DisclosureRow>
      <DisclosureRow title="Show the environment">
        <LogLine fields={["NODE_ENV=production, REGION=us-east, CACHE=on"]} />
      </DisclosureRow>
    </div>
  );
}

// ---- Activity lists ----

function Pipeline({ open }: { open: boolean }) {
  return (
    <ActivityList label="Build 1287">
      <ActivityStep status="done" meta="0.4 s">Checked out main at 4f2c9e1</ActivityStep>
      <ActivityStep status="done" meta="12 s">Installed 214 packages from the lockfile</ActivityStep>
      <ActivityStep status="failed" meta="48 s" defaultOpen={open} detail={<div><LogLine fields={[{ text: "FAIL", loud: true }, " billing/invoice-total.test.ts › rounds a split export"]} /><LogLine fields={["Expected 1,204.50, received 1,204.49"]} /></div>}>
        3 of 412 unit tests failed in the billing module, all in the rounding of split exports
      </ActivityStep>
      <ActivityStep status="running">Building the web app for production</ActivityStep>
      <ActivityStep status="waiting">The deploy to staging needs an approver</ActivityStep>
    </ActivityList>
  );
}

function ContactsImport() {
  return (
    <Stream label="Import">
      <StreamMessage author="Contacts import" time="2:14 PM" avatar={<span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: "var(--basalt-radius-full)", background: "var(--basalt-surface-sunken-strong)" }}><Icon icon={FileTextIcon} size={16} /></span>}>
        <ActivityList label="Importing contacts.csv">
          <ActivityStep status="done" meta="1 s">Read 1,240 rows from contacts.csv</ActivityStep>
          <ActivityStep status="done" meta="3 s">Matched 1,180 rows to people already in the address book by email</ActivityStep>
          <ActivityStep status="done" word="Skipped">12 rows with no email or phone</ActivityStep>
          <ActivityStep status="running">Adding 48 new people</ActivityStep>
        </ActivityList>
      </StreamMessage>
    </Stream>
  );
}

// ---- The entry you came to ----

function ArrivedSupport({ gone, on = true }: { gone: boolean; on?: boolean }) {
  const [arrived, setArrived] = React.useState(on);
  React.useEffect(() => {
    if (!gone) return undefined;
    // The reader acts: a press anywhere ends the mark, which fades out.
    const timer = window.setTimeout(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })), 50);
    return () => window.clearTimeout(timer);
  }, [gone]);
  return (
    <Stream label="Ticket 4821">
      <StreamMessage author="Jules Ferreira" time="Nov 18, 4:12 PM">
        <p>Exporting invoices as CSV gives me an empty file since yesterday.</p>
      </StreamMessage>
      <StreamMessage author="Ada Brooks" time="4:20 PM" arrived={arrived} arrivedLabel="From your notice" onArrivedEnd={() => setArrived(false)}>
        <p>Thanks, Jules. Engineering found it: the first part of a split export was empty. It is fixed for new exports.</p>
      </StreamMessage>
      <StreamMessage author="Jules Ferreira" time="4:31 PM">
        <p>Confirmed, October exports whole now.</p>
      </StreamMessage>
    </Stream>
  );
}

function ArrivedBlock() {
  return (
    <Stream label="Research assistant">
      <StreamMessage author="Research assistant" time="11:40 AM">
        <p>Exports over 5,000 rows are written in parts.</p>
      </StreamMessage>
      <StreamMessage author="Research assistant" time="11:41 AM" joined>
        <p>The status page lists one open issue.</p>
        <StreamBlock arrived arrivedLabel="Search result"><p>The first part of a split export is empty until the fix ships.</p></StreamBlock>
      </StreamMessage>
    </Stream>
  );
}

function ArrivedDoc({ arrived }: { arrived: boolean }) {
  return (
    <Stream label="Comments on section 2">
      <StreamMessage author="Theo Park" time="Mon 3:15 PM">
        <p>Should the pricing table come before the plan names?</p>
      </StreamMessage>
      <StreamEntry panel arrived={arrived}>
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--basalt-space-3)" }}>
              <CardTitle>Suggested edit</CardTitle>
              <StreamArrivedWord />
            </div>
          </CardHeader>
          <CardContent>
            <Text size="sm" tone="secondary">Mina Sato suggests moving “Plan limits” above “Pricing” in section 2.</Text>
            <div style={{ display: "flex", gap: "var(--basalt-space-2)", marginTop: "var(--basalt-space-3)" }}><Button size="sm" variant="primary">Accept</Button><Button size="sm">Decline</Button></div>
          </CardContent>
        </Card>
      </StreamEntry>
      <StreamNote time="Mon 4:05 PM">Theo Park resolved 2 comments</StreamNote>
    </Stream>
  );
}

// ---- Presence ----

const PEOPLE: { name: string; status: "active" | "away" | "offline"; since?: number }[] = [
  { name: "Mina Sato", status: "active" },
  { name: "Rosa Lind", status: "away", since: min(6) },
  { name: "Theo Park", status: "away", since: min(65) },
  { name: "Ada Brooks", status: "offline", since: min(60 * 24 * 3) },
];

function TeamList() {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--basalt-space-3)" }}>
      {PEOPLE.map((person) => (
        <li key={person.name} style={{ display: "flex", alignItems: "baseline", gap: "var(--basalt-space-3)", flexWrap: "wrap" }}>
          <Text as="span" size="sm" weight="medium">{person.name}</Text>
          <Text as="span" size="xs" tone="secondary"><Presence status={person.status} since={person.since} now={NOW} /></Text>
        </li>
      ))}
    </ul>
  );
}

function SupportDesk() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--basalt-space-3)", flexWrap: "wrap" }}>
        <Text as="span" size="sm">Ada Brooks, your support contact</Text>
        <Presence variant="outline" status="away" label="Back soon" since={min(12)} now={NOW} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--basalt-space-3)", flexWrap: "wrap" }}>
        <Text as="span" size="sm">Billing queue</Text>
        <Presence variant="outline" status="active" label="Staffed" now={NOW} />
      </div>
    </div>
  );
}

// ---- LoadingShape on the stream ----

interface Msg { author: string; time: string; text: string }
interface Thread { title: string; messages: Msg[] }
const THREAD: Thread = {
  title: "Can't export my invoices",
  messages: [
    { author: "Jules Ferreira", time: "4:12 PM", text: "Exporting invoices as CSV gives me an empty file since yesterday." },
    { author: "Ada Brooks", time: "4:20 PM", text: "Thanks, Jules. Which date range did you choose, and is it the same for every client?" },
    { author: "Jules Ferreira", time: "4:31 PM", text: "October 1 to 31, and yes, every client." },
  ],
};
const CHAT: Thread = {
  title: "Design review",
  messages: [
    { author: "Theo Park", time: "9:04 AM", text: "The new onboarding screens are in the shared file, on page 3." },
    { author: "Mina Sato", time: "9:11 AM", text: "The second screen reads better with the button at the bottom." },
    { author: "Rosa Lind", time: "9:20 AM", text: "Agreed. I will leave notes in the file after my workshop." },
  ],
};
/** Stand-ins: other words, another hour and one more message in the unseen variant, so every value and the count differ. */
const standInThread = (variant: StandInVariant, n: number): Thread => ({
  title: standIn(1, 24, variant),
  messages: Array.from({ length: n + variant }, (_, i) => ({ author: standIn(10 + i, 11, variant), time: variant === 0 ? `${i + 1}:0${i} AM` : `1${i}:4${i} PM`, text: standIn(20 + i, 60 + (i % 2) * 24, variant) })),
});

function ThreadView({ thread, label }: { thread: Thread; label: string }) {
  return (
    <Stream label={label}>
      {thread.messages.map((m, i) => (
        <StreamMessage key={i} author={m.author} time={m.time}><p>{m.text}</p></StreamMessage>
      ))}
    </Stream>
  );
}

function Loading({ state }: { state: string }) {
  const kind = kindOf(state);
  const loading = kind !== "default";
  const full = kind === "full";
  const region = (thread: Thread, label: string) => (
    <LoadingShape
      loading={loading}
      label="Loading"
      showAfter={0}
      {...(full ? { shape: () => <ThreadView thread={standInThread(0, thread.messages.length)} label={label} /> } : { prefill: (variant: StandInVariant) => <ThreadView thread={fillIn({ title: thread.title }, standInThread(variant, thread.messages.length))} label={label} /> })}
    >
      {() => <ThreadView thread={thread} label={label} />}
    </LoadingShape>
  );
  return (
    <div style={page}>
      <div style={column}>{caption("Support inbox", THREAD.title)}{region(THREAD, "Ticket 4821")}</div>
      <div style={column}>{caption("Team chat", CHAT.title)}{region(CHAT, "Design review channel")}</div>
    </div>
  );
}

const pair = (a: [string, string, React.ReactNode], b: [string, string, React.ReactNode]) => (
  <div style={page}>
    <div style={column}>{caption(a[0], a[1])}{a[2]}</div>
    <div style={column}>{caption(b[0], b[1])}{b[2]}</div>
  </div>
);

const MEDIA = ["forced-colours", "reduced-motion"];
const SHOT = { widths: [1440, 390], scales: [2], bleed: true, touch: true };
const PROCESS = "Decided and built by Opus on the no-council path (DECISIONS 226 and 265); Astra reviews the code and the lead the pixels; the owner sees these pictures before merge. React's alone for now: the HTML skill has no stream module (a follow-up batch).";

export const ROUND_56: Round = {
  id: "56",
  title: "The conversation stream: messages, notes, quotes, the entry you came to, disclosure rows, activity lists and presence (cimip-gaps-2, B2)",
  reviewed: false,
  summary:
    "Parts any app can draw a stream with: a support thread, a team chat, a document's comments, an assistant's answer, a build's steps. StreamMessage (an avatar, a name, a time and the words; consecutive messages joined), StreamNote (a quieter row), StreamQuote (the other side of an exchange, a fill with no rim), the entry a link opened (arrived: a plate in the selected wash and a word, never a frame round a panel), DisclosureRow (one line that opens to its detail), ActivityList (a sentence a step, wrapping) and Presence (“Away 6 min”). Each in two unlike domains, both themes, 1440 and 390, forced colours and reduced motion, and the stream under LoadingShape. " + PROCESS,
  steps: [
    {
      id: "messages",
      name: "Messages, notes and joined runs",
      intro: "A team's chat and a support thread. A new author's message has the avatar, the name and the time; the next from the same author joins it with neither. A note (“Mina Sato joined”, “Assigned to Ada Brooks”) is a quieter row in the text column, with an icon in the gutter when it has one.",
      decisions: [
        "The gutter is the avatar's 32, then space-3, then the text column. The name is 14 at 500 in primary and the time 12 in tertiary, on one baseline; meta (a Presence, a badge) follows the time; actions sit at the end of the head.",
        "The words are 14/20 in primary (text-base: body in apps). A new author starts space-4 below the last entry, a joined message space-1, a note under a note space-2.",
        "The app decides what joins (`joined`): the author, the minutes between, an edit are its rules, not Basalt's. A joined message says its name and time to a screen reader before its words, and draws neither.",
        "A note is 13/18 in secondary with its time after it; its mark is an icon at 16, centred in the gutter. `EventLogRule` is the day rule in a stream as in an event log.",
        "The stream is an ordered list, not a live region, and does not follow its end: the app follows the end only while the reader is at it (as Terminal does) and says what must be heard through StatusLine.",
      ],
      tryIt: ["Read the support thread with a screen reader: the joined message reads “Jules Ferreira, 4:32 PM: A single week works.”"],
      states: MEDIA,
      ...SHOT,
      height: 900,
      demo: () => pair(["Team chat", "Design review", <TeamChat />], ["Support inbox", "Ticket 4821: Can't export my invoices", <SupportThread />]),
    },
    {
      id: "quote",
      name: "The other side of an exchange",
      intro: "What a person asked a help assistant, inside the assistant's answer; and the comment a reply answers, in a document's comments. The quote is a fill with no rim, so the turn it sits in keeps the only frame.",
      decisions: [
        "A fill one step from its ground: in dark the level above what it sits in (#0a0a0a on the page, #111111 in a card), in light the sunken band's grey (#f0f0f0), because light's levels 1 to 3 are one white. Radius 8, as a callout's; space-2 by space-3 inside.",
        "No rim, no bar, no indent rule: a rim would be a second frame inside a turn that may already be in a panel, and a vertical bar is never used (the owner's rule).",
        "The words above say whose it is (“Jules Ferreira asked”, “Replying to Theo Park”), in tertiary at 12 with the time; the fill never carries that alone. They are the app's words.",
        "A figure with a figcaption and a blockquote, so it is read as a quotation with its source.",
      ],
      tryIt: ["Compare the two themes: the quote reads as set apart in both, and its text holds 4.5:1 on the fill (the contrast tests cover every text role on sunken-strong and every level)."],
      states: MEDIA.slice(0, 1),
      ...SHOT,
      height: 700,
      demo: () => pair(["Help desk", "An assistant's answer", <AssistantAnswer />], ["Shared document", "Comments on section 2", <DocComments />]),
    },
    {
      id: "disclosure",
      name: "Disclosure rows",
      intro: "One line that opens to show its detail: a research assistant's searches and reads inside its message, and a build's log. Lighter than Accordion: no heading, no divider, no wash.",
      decisions: [
        "A button (aria-expanded, aria-controls) on Base UI's Collapsible: an optional mark in a 16 seat, the line at 13 in secondary, an optional meta in tertiary, and the core chevron at the end, which morphs from right to down (a rotation group). In right-to-left it points left while closed.",
        "Closed, the line is cut with an ellipsis; open, it wraps, so the whole line is read in place. `wrap` keeps it wrapped while closed (an activity step's sentence).",
        "Hover lifts the ink to primary (and the meta to secondary); there is no wash, as on a ruled list on the page. Focus is the control ring at +2, radius 6. 28 tall, 44 on touch.",
        "The detail opens by height over duration-slow on ease-out and closes at 0.75 on ease-in; under reduced motion it is there at once. The clip reaches space-1-5 past the detail so a ring inside it is whole.",
      ],
      tryIt: ["Open and close a row with Enter and Space: the chevron morphs, the line wraps open.", "Narrow the window: a closed line is cut, an open one wraps."],
      states: ["open", ...MEDIA],
      ...SHOT,
      height: 720,
      demo: ({ state }) => {
        const open = state.startsWith("open") || state !== "default";
        return pair(["Research assistant", "Its searches and reads", <AssistantWork open={open} />], ["Build pipeline", "The log, a row a step", <BuildLog open={open} />]);
      },
    },
    {
      id: "activity",
      name: "Activity lists",
      intro: "Steps that run and report, a sentence each, wrapping at any width: a build's steps, and a contacts import inside its message. A step with detail is a disclosure row.",
      decisions: [
        "Not Stepper (a known sequence), not EventLog (links in mono with a time column, one tab stop) and not LogLine (a log's mono fields): a step is a sentence in the interface font, at 13/18, and wraps.",
        "The plain badge's status seat (6, and a gap as wide): braille while it runs, the tertiary dot once done, the danger dot when it failed, the hollow ring while it waits. The status is in words too: a failed or waiting step draws “Failed” or “Waiting” at 500 in primary before its sentence (as a refused command's word is); a running or done step's word is said, not drawn; an app may draw its own (“Skipped”).",
        "Ink marks where the work is: the running, failed and waiting sentences are primary and done ones secondary. Colour is only the danger dot, beside the word.",
        "Every step keeps the chevron's seat when any step has detail, so the metas line up. It is not a live region: an app says a finished run through StatusLine.",
      ],
      tryIt: ["Open the failed step: its log opens under the sentence, indented to the sentence."],
      states: ["open", ...MEDIA],
      ...SHOT,
      height: 720,
      demo: ({ state }) => pair(["Build pipeline", "Build 1287", <Pipeline open={state !== "default"} />], ["Contacts", "An import, inside its message", <ContactsImport />]),
    },
    {
      id: "arrived",
      name: "The entry you came to",
      intro: "A support reply opened from a notice, and a suggested edit opened from a link in a document's comments. The entry is scrolled to, focused and marked until the reader acts.",
      decisions: [
        "The mark is the selected wash on the entry's own ground, and a word. A message or a note takes a plate (one solid fill per level, the choice card's recipe), radius 8, reaching space-2 past it at the sides and space-1 above and below, behind its content, so nothing in it moves.",
        "A panel (a card, a callout) is never framed from outside: its own fill takes the wash, inside its one rim, and the app puts StreamArrivedWord in its head. No outer frame, no outline, no bar.",
        "The word says it, so the fill never carries it alone: “Linked” by default, or the app's (“From your notice”, “Search result”), in secondary at 12 in the head. Tertiary words on the wash step up to secondary. A joined message that arrives draws its head, and keeps it.",
        "It lasts until the reader acts: a press, or a key that does not scroll (arrows, Page Up and Down, Home, End and Space read around it). Then it fades over 0.75 of duration-slow on ease-in, and the word's room is kept, so nothing moves. It comes at once.",
        "Focus moves to the entry (tabindex -1) with no ring, as a page's title does after a route change: it is a place, not a control. Short entries scroll to the middle of what scrolls them; one taller than most of that (a pane's height, or the window's) to its top. An entry in a hidden pane waits until it has a box, then is placed once.",
        "One entry arrives at a time: placing another ends the one before, with its onArrivedEnd. A block inside a message says its own word in the message's head; in a joined message, which has no head, it draws the word above itself.",
        "Forced colours: the fill drops and the word stays. Reduced motion: the same fade, which is opacity and colour only.",
      ],
      tryIt: ["Press anywhere: the plate and the word fade, and nothing moves.", "Press an arrow key first: the mark stays."],
      states: ["gone", "panel", "panel-forced-colours", "block", "block-forced-colours", ...MEDIA],
      ...SHOT,
      height: 720,
      // One entry arrives at a time, page-wide, so each state opens one: the support reply, the document's card, or a block in a joined message.
      demo: ({ state }) => state.startsWith("block")
        ? pair(["Research assistant", "A search result inside a joined message", <ArrivedBlock />], ["Shared document", "Not opened from a link", <ArrivedDoc arrived={false} />])
        : state.startsWith("panel")
          ? pair(["Support inbox", "Not opened from a notice", <ArrivedSupport gone={false} on={false} />], ["Shared document", "Opened from a link", <ArrivedDoc arrived />])
          : pair(["Support inbox", "Opened from a notice", <ArrivedSupport gone={state === "gone"} />], ["Shared document", "Not opened from a link", <ArrivedDoc arrived={false} />]),
    },
    {
      id: "presence",
      name: "Presence with a duration",
      intro: "“Away 6 min” beside a name in a team list, and a support contact's state in a badge.",
      decisions: [
        "Presence is a Badge: the success dot while active, the hollow ring while away, the tertiary dot while offline, and always the state's word (“Active”, “Away”, “Offline”, or the app's: “Back soon”, “Staffed”). Plain beside a name, or in its outline.",
        "With `since`, the length follows the word in its ink: nothing under a minute, then “6 min”, “1 hr 5 min”, “3 days”. It is a duration (how long a state that is still true has lasted, like a countdown the other way), not a relative age, so it needs no date beside it.",
        "It ticks by the minute on the one shared timer, holds under data-loops=“held”, is no live region and is not stopped by reduced motion. `Elapsed` and `formatElapsed` are the parts for any other word with a length (“Running 12 min”). Another language passes its own formatter.",
      ],
      tryIt: ["Pause animations: the minutes hold, and catch up when released."],
      states: MEDIA.slice(0, 1),
      ...SHOT,
      height: 520,
      demo: () => pair(["Team chat", "Who is here", <TeamList />], ["Support portal", "Your contact", <SupportDesk />]),
    },
    {
      id: "loading",
      name: "LoadingShape on the stream",
      intro: "The two threads under LoadingShape: the full shape (nothing known) and the prefill (the title known, the messages not). Avatars are bones in their discs, names, times and words are bars, as long as their words.",
      decisions: [
        "Nothing in the stream's parts is drawn by hand for loading: the shape is the stream itself with stand-ins, painted as bones measured from the drawing.",
        "An arrived entry does nothing in a shape or its twin (no scroll, no focus, no mark): it scrolls and focuses once the content takes the shape's place.",
        "Presence's minutes and an activity step's braille are drawn like any mark: a bone in its box.",
      ],
      tryIt: ["Compare full and prefill: both are the same structure, the stand-ins differ."],
      states: ["full", "prefill", "prefill-forced-colours", "prefill-reduced-motion"],
      ...SHOT,
      height: 640,
      demo: ({ state }) => <Loading state={state} />,
    },
  ],
};
