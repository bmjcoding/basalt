// Round 44: logs, status and forms (DECISIONS 162, batch 8 of the port, stream components-nov14): scrollback blocks, an event log, a log in fixed slots (D14a), the
// status bar and the source stamp with "waiting" and "unreachable" in words (D14b), description-list forms, inline-label rows, the Send hint and the filter toolbar (D15),
// route focus (X10), single-key shortcuts and time parts (X11). Each was ported from a site the owner approved (DECISIONS 151); the council voted on what the port had to
// change (DECISIONS 162). The design panel has not reviewed this implementation. Every word is synthetic: no name, brand or figure is a real one.
//
// The readouts are this page's own: they are measured from the rendered DOM when the page loads (a number printed here is the browser's). "hover" puts a real pointer on the
// part that marks itself `data-wt-hover`; "focus" moves focus to the part's first control. "forced-colours" and "reduced-motion" are real emulations; "touch" is a coarse pointer.

import * as React from "react";

import {
  ActionShortcut, Button, ChevronRightGlyph, Clock, CommandBlock, Countdown, DateAge, DescriptionColumns, DescriptionItem, DescriptionList, DrawerTrigger, EventLine, EventLog, EventLogRule, EventText, EventTime,
  FilterResult, FilterToolbar, InlineField, InlineFields, InlineInput, InlineTextarea, InlineValue, Listbox, ListboxOption, LogLine, LogSlots, LogSummary, MultiSelect, Select, ShortcutList, SingleKeysSwitch,
  SourceStamp, SourceStateWords, StatusBar, Terminal, Text, formatAge, useRouteFocus, useShortcuts,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap" };
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const box = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
const NOW = Date.UTC(2026, 10, 17, 14, 49, 7);

type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** Runs `read` once the page has laid out, prints the lines it returns, and registers on `window.__BASALT_READY__` (build.mjs awaits it before a still). */
function Readout({ read, title = "Measured on this page" }: { read: (root: HTMLElement) => string[]; title?: string }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const ready = React.useRef<{ promise: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    ready.current = { promise, done };
  }
  React.useLayoutEffect(() => {
    const own = ready.current!;
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([own.promise, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    return () => own.done();
  }, []);
  React.useEffect(() => {
    let live = true;
    const t = window.setTimeout(async () => {
      const root = ref.current?.closest("[data-round44]") as HTMLElement | null;
      let next: string[];
      try { next = root ? read(root) : ["(no page to measure)"]; } catch (error) { next = [`(the measurement failed: ${error instanceof Error ? error.message : String(error)})`]; }
      if (!live) return;
      setLines(next);
      await frames(3);
      if (live) ready.current?.done();
    }, 400);
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <pre ref={ref} style={mono}>{`${title}\n${lines.join("\n")}`}</pre>;
}
const Page = ({ children }: { children: React.ReactNode }) => <div data-round44="" style={col}>{children}</div>;
function useFocusFirst(state: string, selector: string) {
  React.useEffect(() => {
    if (state !== "focus") return;
    const t = window.setTimeout(() => (document.querySelector(selector) as HTMLElement | null)?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [state, selector]);
}
const hover = (state: string) => (state === "hover" ? { "data-wt-hover": "" } : {});

// ---- D14a: log lines, blocks and slots
function LogsDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-code-pre");
  const [n, setN] = React.useState(state === "arrive" ? 1 : 3);
  React.useEffect(() => { if (state === "arrive") { const t = window.setTimeout(() => setN(5), 300); return () => window.clearTimeout(t); } return undefined; }, [state]);
  const lines = Array.from({ length: n }, (_, i) => ({ id: i + 1, fields: ["sent ", { text: `${i + 1} of 9`, loud: true }, " to a.example, b.example"] as const }));
  const wide = [["sent ", { text: "100 of 100", loud: true }, " to a.example, b.example, c.example, d.example"] as const];
  return (
    <Page>
      <div style={{ maxWidth: 720, ...col }}>
        <Terminal title="Proxy" lines={[{ kind: "command", text: "get a.example" }, { kind: "output", text: "allowed 200", fields: ["a.example ", { text: "allowed", loud: true }, " 200"] }, { kind: "output", text: "denied", fields: ["b.example ", { text: "denied,403", loud: true }] }]} />
        <div>
          <CommandBlock command="get b.example" status="403" refused exit={1} at={NOW} timeZone="UTC" {...hover(state)}><LogLine fields={["b.example ", { text: "denied", loud: true }, " (policy)"]} /></CommandBlock>
          <CommandBlock command="get a.example" status="allowed" exit={0} at={NOW + 6000} timeZone="UTC"><LogLine fields={["a.example ", { text: "allowed", loud: true }, " 200"]} /></CommandBlock>
        </div>
        <LogSlots label="Sent" lines={lines} widest={wide} />
        <LogSummary aria-label="Summary" items={[{ keyword: "sent", value: String(n) }, { keyword: "denied", value: "1" }, { keyword: "hosts", value: "2" }, { keyword: "bytes", value: "512" }]} />
      </div>
      <Readout read={(root) => {
        const head = root.querySelector(".basalt-command-block-head")!;
        const s = getComputedStyle(head);
        return [
          `the block: 16/24, head padding ${s.paddingTop} above and ${s.paddingBottom} below (20, 16), under each block ${getComputedStyle(root.querySelector(".basalt-command-block")!).paddingBottom} (64), sticky: ${s.position}`,
          `a loud field: ${getComputedStyle(root.querySelector(".basalt-log-field")!).color} at weight ${getComputedStyle(root.querySelector(".basalt-log-field")!).fontWeight}; the refused field "denied,403" is the same ink as any (no colour)`,
          `the refused command's status word: weight ${getComputedStyle(root.querySelector("[data-refused]")!).fontWeight}, ink ${getComputedStyle(root.querySelector("[data-refused]")!).color}`,
          `the slots' box: ${px(box(root.querySelector(".basalt-log-slots"))!.height)} for ${root.querySelectorAll(".basalt-log-slot").length} slots, whatever they hold (it must not change as lines arrive: "arrive" adds four)`,
        ];
      }} />
    </Page>
  );
}

/** The ring as the stylesheet sets it for a focused line (read from the `:focus-visible` rule, so it is the same whether or not the line holds focus now). */
function ringLine(line: Element) {
  const rule = [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } }).flatMap((r) => [r, ...(("cssRules" in r ? [...(r as CSSGroupingRule).cssRules] : []) as CSSRule[])])
    .find((r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText.includes(".basalt-event-line:focus-visible"));
  const root = getComputedStyle(document.documentElement);
  const width = root.getPropertyValue("--basalt-size-focus-width").trim();
  const offset = root.getPropertyValue("--basalt-size-focus-offset").trim();
  return `the ring (the stylesheet's :focus-visible rule): ${width} solid at offset ${offset} (2px, +2); the rule is ${rule ? "present" : "missing"}; background on the line now: ${getComputedStyle(line).backgroundColor} (no wash on focus); the list keeps ${getComputedStyle(document.querySelector(".basalt-event-log")!).paddingLeft} from its edge`;
}

// ---- D14a: the event log
function EventsDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-event-line");
  return (
    <Page>
      <div style={{ maxWidth: 520, ...col }}>
        <EventLog label="Activity">
          <EventLogRule>New since you left</EventLogRule>
          <EventLine href="#a" verb="opened" object="the pricing page" detail="from the site map" time="Nov 17 9:39 AM" unread {...(state === "hover" ? { "data-wt-hover": "" } : {})} />
          <EventLine href="#b" verb="read" object="the notes" time="Nov 17 9:38 AM" />
          <EventLogRule>16 Nov</EventLogRule>
          <EventLine href="#c" verb="followed" object="a link" time="09:12:40" />
        </EventLog>
        <Listbox label="Session log" defaultValue="a">
          <ListboxOption value="a" leading={<EventTime>09:39:11</EventTime>}><EventText verb="opened" object="the page" /></ListboxOption>
          <ListboxOption value="b" leading={<EventTime>09:38:00</EventTime>} disabled><EventText verb="read" object="the notes" /></ListboxOption>
        </Listbox>
      </div>
      <Readout read={(root) => {
        const lines = [...root.querySelectorAll(".basalt-event-line")];
        return [
          `time columns: ${lines.map((l) => px(box(l.querySelector(".basalt-event-time"))!.width)).join(", ")} (one width: the widest stamp, "00 Mmm 00:00", is held in each)`,
          `text edges: ${lines.map((l) => px(box(l.querySelector(".basalt-event-text"))!.x)).join(", ")} (one edge)`,
          `the dot's seat: ${px(box(root.querySelector(".basalt-event-dot"))!.width)} in every line, filled only on the unread one; no weight change (${getComputedStyle(root.querySelector(".basalt-event-object")!).fontWeight})`,
          ringLine(lines[0]!),
        ];
      }} />
    </Page>
  );
}

// ---- D14b: the source stamp and its words
function SourcesDemo({ state }: { state: string }) {
  useFocusFirst(state, "button.basalt-source-stamp");
  const [s, setS] = React.useState<"asking" | "unreachable">("asking");
  React.useEffect(() => { if (state === "fail") { const t = window.setTimeout(() => setS("unreachable"), 300); return () => window.clearTimeout(t); } return undefined; }, [state]);
  return (
    <Page>
      <div style={{ ...col, gap: 8, alignItems: "flex-start" }}>
        <SourceStamp source="github" state="answered" at={NOW + 7000 * 3} timeZone="UTC" onOpen={() => {}} {...(hover(state) as object)} />
        <SourceStamp source="github" state="stale" at={NOW} timeZone="UTC" />
        <SourceStamp source="github" state="asking" />
        <SourceStamp source="github" state="idle" />
        <SourceStamp source="github" state="unreachable" />
      </div>
      <div style={{ maxWidth: 420 }}><SourceStateWords what="the weather" state={s} tried={NOW} timeZone="UTC" why="timed out" onRetry={() => {}} alternative={<a href="#elsewhere">See it elsewhere</a>} /></div>
      <Readout read={(root) => {
        const stamps = [...root.querySelectorAll(".basalt-source-stamp")];
        return [
          `the mark's seat: ${stamps.map((l) => `${px(box(l.querySelector(".basalt-source-seat"))!.width)} by ${px(box(l.querySelector(".basalt-source-seat"))!.height)}`).join(", ")}`,
          `the words' left edge in the five states: ${stamps.map((l) => px(box(l.querySelector(".basalt-source-words"))!.x)).join(", ")} (one edge: a change of state moves nothing)`,
          `the gap: ${getComputedStyle(stamps[1]!).columnGap} (6); the words' ink: tertiary, and secondary for stale and unreachable`,
          `"waiting" and "unreachable" share one cell: the band is ${px(box(root.querySelector(".basalt-source-state"))!.height)} tall in either state ("fail" switches it)`,
        ];
      }} />
    </Page>
  );
}

// ---- D14b: the status bar
function BarDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-status-bar a");
  const [message, setMessage] = React.useState<{ text: string; status?: "error"; logged?: boolean; id: number } | null>(state === "error" ? { text: "Could not reach github", status: "error", id: 1 } : state === "message" ? { text: "Not a command: zz", logged: true, id: 1 } : null);
  return (
    <Page>
      <div style={{ ...col, minHeight: 260, border: "1px solid var(--basalt-border-divider)", borderRadius: 8, overflow: "hidden", justifyContent: "space-between", position: "relative", transform: "translateZ(0)" }}>
        <Text size="sm" tone="secondary" style={{ padding: 16 }}>A page with a foot. The bar is 44 tall from 720 and fixed under 720 (56 plus the safe area).</Text>
        <StatusBar
          start={<a href="#run" className="basalt-link">run 4f2a, 3 allowed, 1 denied</a>}
          sources={<DrawerTrigger drawer="drawer" open={state === "open"} variant="ghost" size="sm" {...hover(state)}>1 of 2 sources, session 04:12</DrawerTrigger>}
          message={message}
          onMessageClear={() => setMessage(null)}
          end={<Button variant="ghost" size="sm">Theme</Button>}
        />
      </div>
      <Readout read={(root) => {
        const bar = root.querySelector(".basalt-status-bar")!;
        return [
          `the bar: ${px(box(bar)!.height)} tall, ${getComputedStyle(bar).position}; the message slot reserves ${px(box(root.querySelector(".basalt-status-bar-message"))!.height)} whether it holds a message or not`,
          `a message the app has also logged clears after ${5000}ms; any other stays until replaced or cleared with Esc; an error says it by XCircle in a 16px seat${box(root.querySelector(".basalt-status-bar-seat")) ? ` (measured ${px(box(root.querySelector(".basalt-status-bar-seat"))!.width)})` : " (shown in the \"error\" state)"}, danger ink and an assertive region`,
        ];
      }} />
    </Page>
  );
}

// ---- D15: description lists, inline rows, the filter toolbar
function FormsDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-inline-control");
  return (
    <Page>
      <DescriptionList form="stacked" style={{ maxWidth: 560 }}>
        <DescriptionItem term="Search">What it looks for, in a sentence long enough to wrap onto a second line when the column is narrow.</DescriptionItem>
        <DescriptionItem term="Notes">Another, shorter.</DescriptionItem>
      </DescriptionList>
      <DescriptionList form="three" style={{ maxWidth: 720 }}>
        <DescriptionItem term="get" detail="fetch a page">a.example</DescriptionItem>
        <DescriptionItem term="send" detail="send a message to the owner">message-to-owner.example</DescriptionItem>
      </DescriptionList>
      <DescriptionColumns>
        {["Run", "Source"].map((k) => <DescriptionList key={k}><DescriptionItem term="Name">{k}</DescriptionItem><DescriptionItem term="State" missing>x</DescriptionItem></DescriptionList>)}
      </DescriptionColumns>
      <InlineFields style={{ maxWidth: 560 }}>
        <InlineValue label="to">someone@example.invalid</InlineValue>
        <InlineField label="subject"><InlineInput placeholder="what it is about" /></InlineField>
        <InlineField label="message" multiline><InlineTextarea placeholder="write here" /></InlineField>
      </InlineFields>
      <div><ActionShortcut shortcut="⌘↵"><Button type="submit" variant="primary" {...hover(state)}>Send</Button></ActionShortcut></div>
      <FilterToolbar label="Filter and sort" kind={<Select aria-label="Kind" controlSize="2xl" options={[{ value: "all", label: "Everything" }]} defaultValue="all" />}
        filter={<MultiSelect label="Brand" toolbar options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} defaultValue={[]} />}
        result={<FilterResult>Showing 24 of 24 products</FilterResult>} sort={<Select aria-label="Sort" controlSize="2xl" options={[{ value: "f", label: "Featured" }]} defaultValue="f" />} />
      <Readout read={(root) => {
        const dt = root.querySelector(".basalt-description-list[data-form=stacked] dt")!;
        const row = root.querySelector(".basalt-inline-field")!;
        const first = root.querySelectorAll(".basalt-description-list[data-form=three] .basalt-description-more");
        const cols = [...root.querySelectorAll(".basalt-description-columns > .basalt-description-list")];
        return [
          `stacked: title ${getComputedStyle(dt).fontSize}/${getComputedStyle(dt).lineHeight} at ${getComputedStyle(dt).fontWeight}, no divider (${getComputedStyle(root.querySelector(".basalt-description-list[data-form=stacked] .basalt-description-item")!).boxShadow})`,
          `three-column: the detail starts at ${px(box(first[0]!)!.x)} and ${px(box(first[1]!)!.x)} (one edge)`,
          `facts: ${cols.map((c) => px(box(c)!.width)).join(", ")} wide, each at least 480 (none stacks)`,
          `inline row: label ${px(box(row.querySelector(".basalt-inline-label"))!.width)} (80), row ${px(box(row)!.height)} (at least 44), bottom line ${getComputedStyle(root.querySelectorAll(".basalt-inline-field")[1]!).borderBottomColor}; on focus a ${getComputedStyle(row).outlineWidth} outline at -2 inset round the row`,
          `Send: aria-keyshortcuts="${root.querySelector(".basalt-action-shortcut button")!.getAttribute("aria-keyshortcuts")}", the two chips beside it`,
        ];
      }} />
    </Page>
  );
}

// ---- X10 and X11: route focus, shortcuts, time
function BehavioursDemo({ state }: { state: string }) {
  const title = React.useRef<HTMLHeadingElement>(null);
  const [page, setPage] = React.useState("home");
  useRouteFocus({ key: page, title: `${page} | Shop`, target: title });
  const [log, setLog] = React.useState<string[]>([]);
  const bindings = React.useMemo(() => [{ key: "j", description: "Next line", run: () => setLog((l) => [...l, "j"]) }, { key: "?", description: "Show this list", run: () => setLog((l) => [...l, "?"]) }], []);
  const { shortcuts } = useShortcuts(bindings);
  React.useEffect(() => { if (state === "go") { const t = window.setTimeout(() => setPage("shop"), 300); return () => window.clearTimeout(t); } return undefined; }, [state]);
  return (
    <Page>
      <h3 ref={title} tabIndex={-1} style={{ outline: "none", margin: 0 }}>{page}</h3>
      <Button size="sm" onClick={() => setPage(page === "home" ? "shop" : "home")}>Change page</Button>
      <div style={{ maxWidth: 420 }}><ShortcutList shortcuts={shortcuts} /><SingleKeysSwitch /></div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline" }}>
        <span>Clock <Clock timeZone="UTC" now={NOW} /></span>
        <span>Opens in <Countdown to={NOW + (18 * 86400 + 9 * 3600 + 10 * 60 + 51) * 1000} now={NOW} /></span>
        <DateAge time={NOW - 11 * 86400000} now={NOW} timeZone="UTC" />
        <DateAge time={NOW - 11 * 86400000} now={NOW} timeZone="UTC" short />
      </div>
      <Readout read={() => [
        `focus after a page change: ${document.activeElement?.tagName ?? "none"} (the page's title, no ring); document.title "${document.title}"`,
        `an age is only ever beside its date: ${formatAge(NOW - 11 * 86400000, NOW)} / ${formatAge(NOW - 11 * 86400000, NOW, { short: true })}; the countdown and the clock are \`time\` elements, no live region`,
        `keys: ${log.join(",") || "(press j, or ? once the list is on screen)"}`,
      ]} />
      <Text size="sm" tone="secondary"><ChevronRightGlyph /> single keys ignore a modifier, a field and [data-own-keys]; the Switch turns them all off (basalt-keys)</Text>
    </Page>
  );
}

const ALL = ["hover", "focus", "forced-colours", "reduced-motion", "touch"];
const COMMON = { widths: [1440, 390], scales: [1, 2], height: 900 };

export const ROUND_44: Round = {
  id: "44",
  title: "Logs, status and forms: blocks, event log, slots, status bar, source stamp, description-list forms, inline rows, route focus, shortcuts and time",
  reviewed: false,
  summary:
    "The last of the site-prototype ports but one (DECISIONS 162), from the owner's approved sites with the council's changes: a log line's fields in one look, scrollback blocks, an event log, a log in fixed slots, a status bar, the source stamp and its words, description-list forms, inline-label rows with the Send hint, the filter toolbar, route focus, single-key shortcuts with an off switch, and time parts. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "logs", name: "D14a: log lines, command blocks and the log in slots", intro: "A log line's fields in primary ink at 400 and the rest secondary; a block with a sticky head; three fixed slots and a four-line summary.",
      ...COMMON, states: [...ALL, "arrive"],
      decisions: [
        "V1, 3 to 1 (muse wrote in the same): every line's fields are primary at 400 and the rest secondary at 400; nothing steps back with age. Built in LogFields (log-fields.tsx), styled at components.css .basalt-log-field.",
        "V2, 3 to 1: a refused field stays primary and its word says it; the refused command's status word is primary at 500 beside exit N (CommandBlock `refused`). Grok's write-in (an XCircle on the head, danger ink on the word) did not win.",
        "R1 16/24, R2 space-16 under a block, R3 28 between the command and its meta (space-6 plus space-1: there is no space-7 token), R4 (13/20, as Terminal) stand as proposed. Ported as approved: the sticky opaque head, 20 above and 16 below, the command at 500, the meta in tertiary, a hairline between blocks.",
        "Defects not copied: the always-polite scrollback, the head covering a focused link (a `--_basalt-block-top` and the app's scroll-padding), a private fade keyframe (duration-base, ease-out, opacity only; none under reduced motion), empty slots hidden from a reader.",
      ],
      tryIt: ["\"arrive\" adds four lines: the slots' box must not change.", "Tab to the log: the terminal's own ring."],
      demo: ({ state }) => <LogsDemo state={state} />,
    },
    {
      id: "events", name: "D14a: the event log", intro: "Lines of a time, a verb and an object with a quieter second line, as links with one tab stop, day rules and a labelled rule; and as the lines of a Listbox.",
      ...COMMON, states: ALL,
      decisions: [
        "V3, 4 to 0: the control ring at +2 outside each line (radius as the line's plate), the list keeps space-1-5 from its clipping edge, the hover wash stays full bleed and focus adds no wash. The prototype's inset outline with a wash is the AI tell DECISIONS 135 lists.",
        "V4, 3 to 1 (muse wrote in the same; opus: as the notification centre builds it, with a hidden \"New: \"): a new line is a 6px dot in a seat every line keeps and primary ink; no weight change and no colour flash. The line's verb lifts to primary while it is new (my reading of \"primary ink\": the object is primary at rest).",
        "R5, 3 of 4 (opus, sol, grok): each time column is as wide as the widest stamp it can show, measured in the line's own font by holding that stamp unseen in the cell (Reserve): \"00:00:00\" for the session log and \"00 Mmm 00:00\" for the activity list. The ListboxOption gains a `leading` cell (B5).",
      ],
      tryIt: ["Tab into the list, then use the arrows, Home and End: one tab stop.", "The disabled session line takes no click."],
      demo: ({ state }) => <EventsDemo state={state} />,
    },
    {
      id: "sources", name: "D14b: the source stamp and its words", intro: "A source's name and when it answered, with a shape and a word; and what a block says while it waits or fails.",
      ...COMMON, states: [...ALL, "fail"],
      decisions: [
        "V5, no majority (opus a; grok wrote in the same; sol b; muse wrote in Basalt's shipped marks), so (a) stands: the four 8px shapes as drawn, braille for \"asking\" in the mark's seat, the just-landed flash dropped; in forced colours each draws in the system foreground.",
        "V6, 4 to 0: the source first, the time to the second, no middle dot (\"github 18:52:07\"); Stat is unchanged. R8 (an 8 by 10 seat, space-1-5 gap) stands as proposed, over two objections for a 16px seat.",
        "B8: both sentences stand in one cell, so the band keeps its height; the failure is said once through StatusLine; Ask again is a TextButton; never a spinner or skeleton.",
      ],
      tryIt: ["\"fail\" swaps the waiting sentence for the unreachable one: the band's height is printed.", "Tab to the first stamp: the control ring at +2."],
      demo: ({ state }) => <SourcesDemo state={state} />,
    },
    {
      id: "status", name: "D14b: the status bar", intro: "A 44px foot with the run, the sources button, a message slot and the theme; fixed under 720.",
      ...COMMON, states: [...ALL, "message", "error"],
      decisions: [
        "V7, 3 to 1 (sol wrote in the same with wrapped room reserved): the slot keeps a 5000ms timer (R7) only for a message the app has also written to its log; any other message stays until replaced or cleared with Esc. An error has XCircle in a 16px seat and danger ink and is said through an assertive region. The slot reserves one line. Sol's wrapped room was not built: the phone message is stacked above the bar, out of flow.",
        "To the builder: a page has one foot; the status bar and a phone tab bar do not share it (a product that needs both is a later vote). 44px in the layout from 720 and fixed under 720 (56 plus the safe area), as built.",
        "R6 stands: gaps space-4, space-2 and space-2-5; the sources button is a ghost sm Button (28) whose open plate is surface-raised.",
      ],
      tryIt: ["\"message\" and \"error\" show the slot's two states; the bar's height is printed.", "Resize to 390: the bar is fixed at the foot."],
      demo: ({ state }) => <BarDemo state={state} />,
    },
    {
      id: "forms", name: "D15: description-list forms, inline rows, the Send hint and the filter toolbar", intro: "A stacked list, a three-column list, facts in columns, ruled inline-label rows, the Send hint and the toolbar of filter, count and sort.",
      ...COMMON, states: ALL,
      decisions: [
        "V8, 4 to 0: Basalt's list as it ships (160px label, 40px rows); facts lay whole lists out in columns of at least 480; the three-column form is term, thing, detail. V9, 3 to 1: dividers between rows only. R9 gap 20, R10, R11 480 stand. The facts' column gap (32) is not on the ballot: it is the nearest token to the prototype's 4ch.",
        "V10, no majority (opus, grok a; muse and sol wrote in the same with a taller textarea row), so (a) stands: a label then a bare field, each row's bottom line the input boundary, a 2px outline at -2 inset round the row on focus, 44 tall. A textarea row grows (a fixed 44 would clip it); R12's new token is size-field-label-inline = 80.",
        "V11, 4 to 0: Send stays primary with aria-keyshortcuts=\"Meta+Enter\"; the two chips (⌘ and ↵) stand beside it as a hint, hidden on touch until a hardware key.",
        "C14 (no vote): the filter toolbar's values are all in tokens; the count is FilterResult, not a bare role=status.",
      ],
      tryIt: ["Tab into the subject row: the outline runs round the whole row.", "At 390 the kind select shows and the word Sort hides."],
      demo: ({ state }) => <FormsDemo state={state} />,
    },
    {
      id: "behaviours", name: "X10 and X11: route focus, single-key shortcuts and time parts", intro: "Focus to the page's title after a page change, single keys with an off switch, a clock, a countdown and an age beside its date.",
      ...COMMON, states: ["focus", "go", "reduced-motion", "forced-colours"],
      decisions: [
        "X10 (no vote): a hook, not a part; focus goes to the page's title with preventScroll and no ring, skips the first render, and leaves focus on a control whose own value changed the page (WCAG 3.2.2).",
        "V12, 3 to 1 (grok wrote in a visible opener): single keys as built plus a \"Single-key shortcuts\" Switch (default on, stored as basalt-keys). Off takes every key, ? included; the help dialog has a visible opener that is not a single key (the app's).",
        "V13, 3 to 1: an age only beside its absolute date, coarse as built. For the owner's review: option (a) adds a date beside the repo list's \"11d\", which his approved list does not have. V14, 4 to 0: a countdown ticks by the second and a clock by the minute on one shared timer; data-loops=\"held\" freezes both; no live region; reduced motion does not stop them.",
      ],
      tryIt: ["\"go\" changes the page: focus moves to the title and document.title changes.", "Press j: it logs; turn the Switch off and press j again."],
      demo: ({ state }) => <BehavioursDemo state={state} />,
    },
  ],
};
