// Round 22: pausing spinners, and the gap beside braille. The council voted (DECISIONS 99, a three-member round: Muse's vote failed on its
// quota): `data-loops="held"` on <html> holds every loop Basalt draws, `useLoops()` keeps the state, the control is a pressed-toggle Button
// in the view's head, a settings row with a Switch and a command, and the app's own rewriting text shows when work started while held.
// Beside braille the seat is the cell's width and the gap equals it, so words start at 12, 18 and 24. This is that design built as decided.
// The design panel has not reviewed this implementation; neither has the owner. The indeterminate Progress bar holds as the empty
// track (DECISIONS 102).
//
// The states are real. "held" is the hold itself (the demo calls useLoops().setHeld(true), exactly as an app's control would, and
// releases it when the step is left); "reduced-motion" and "forced-colours" are emulations build.mjs sets before the page loads;
// "command" opens the command menu. Everything here is synthetic.

import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CommandMenu,
  Progress,
  Skeleton,
  Sparkline,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Text,
  useLoops,
  useToast,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };

/** Lets a demo shrink to the page: a wide table scrolls inside its own container instead of the page. */
function Fit({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", width: "100%" }}>{children}</div>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const isShot = () => new URLSearchParams(window.location.search).get("shot") === "1";

/** A demo that holds the loops while it is on screen, the way an app's control would, and lets go when the step is left. */
function useDemoHold(want: boolean | undefined) {
  const { setHeld } = useLoops();
  React.useLayoutEffect(() => {
    if (want === undefined) return undefined;
    setHeld(want);
    return () => setHeld(false);
  }, [want, setHeld]);
}

// ---- the app's part: elapsed time and its held form (synthetic; the app writes this, Basalt does not)

/** "Now" for the specimens, fixed so a screenshot is the same every time. */
const NOW = new Date(2026, 10, 10, 15, 51, 20);
const at = (hours: number, minutes: number, seconds: number, dayOffset = 0) => new Date(2026, 10, 10 + dayOffset, hours, minutes, seconds);

function elapsedText(start: Date, now: Date) {
  const total = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

/** DECISIONS 94's clock: the time for today, the date for another day, and the year only when it differs. */
function startedText(start: Date, now: Date) {
  const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (start.toDateString() === now.toDateString()) return `Started ${time}`;
  const date = start.toLocaleDateString("en-US", start.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
  return `Started ${date}, ${time}`;
}

interface Run {
  id: string;
  name: string;
  state: "running" | "passed" | "failed";
  start: Date;
  /** Streaming progress the app writes while the work runs. */
  step?: [number, number];
  duration?: string;
}

const RUNS: Run[] = [
  { id: "run-0143", name: "Build api", state: "running", start: at(15, 47, 3), step: [41, 212] },
  { id: "run-0142", name: "Deploy web", state: "running", start: at(21, 12, 40, -1), step: [3, 5] },
  { id: "run-0141", name: "Lint packages", state: "passed", start: at(15, 30, 0), duration: "1m 12s" },
  { id: "run-0140", name: "Test worker", state: "failed", start: at(14, 58, 0), duration: "3m 40s" },
];

/** A column that holds an elapsed time is wide enough for its held form: "Started Nov 9, 9:12 PM" at 13px is 150px. */
const RUN_COLUMNS = [{}, { width: 132 }, { width: 176 }, { width: 176 }];  // Run, Status, Time, Step

/**
 * The runs table, with the app's text wired to `held`: an elapsed time shows when the work started, and a streaming step line hides
 * while the status word stays. A result is never held: Passed and Failed read the same either way.
 */
function RunsTable({ held, now, label }: { held: boolean; now: Date; label: string }) {
  return (
    <TableContainer>
      <Table columns={RUN_COLUMNS} minWidth={640} aria-label={label}>
        <TableHeader>
          <TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead><TableHead>Step</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {RUNS.map((run) => (
            <TableRow key={run.id}>
              <TableRowHead>{run.name}</TableRowHead>
              <TableCell>
                {run.state === "running" ? <Badge variant="plain"><Spinner variant="braille" />Running</Badge> : run.state === "passed" ? <Badge variant="plain" status="success">Passed</Badge> : <Badge variant="plain" status="danger">Failed</Badge>}
              </TableCell>
              <TableCell>{run.state !== "running" ? run.duration : held ? startedText(run.start, now) : elapsedText(run.start, now)}</TableCell>
              <TableCell>{run.state === "running" && run.step && !held ? `Compiling ${run.step[0]} of ${run.step[1]}` : ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * A two-line cell: the name over its step line. While held the step line hides with `visibility: hidden`, which keeps its box (and takes
 * it out of the accessibility tree), and on release the current text is written into the same box, so neither moves a row.
 */
function TwoLineTable({ held, now, label }: { held: boolean; now: Date; label: string }) {
  return (
    <TableContainer>
      <Table columns={[{}, { width: 132 }, { width: 176 }]} minWidth={560} aria-label={label}>
        <TableHeader>
          <TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {RUNS.slice(0, 3).map((run) => (
            <TableRow key={run.id}>
              <TableRowHead>
                <span style={{ display: "block" }}>{run.name}</span>
                <Text as="span" size="sm" tone="secondary" data-step-line="" style={{ display: "block", visibility: held ? "hidden" : "visible", fontWeight: 400 }}>
                  {run.step ? `Compiling ${run.step[0]} of ${run.step[1]}` : run.duration}
                </Text>
              </TableRowHead>
              <TableCell>
                {run.state === "running" ? <Badge variant="plain"><Spinner variant="braille" />Running</Badge> : <Badge variant="plain" status="success">Passed</Badge>}
              </TableCell>
              <TableCell>{run.state !== "running" ? run.duration : held ? startedText(run.start, now) : elapsedText(run.start, now)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TwoLineDemo() {
  const frame = React.useRef<HTMLDivElement>(null);
  const [report, setReport] = React.useState("");
  React.useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const heights = [...el.querySelectorAll<HTMLElement>("[data-two-line]")].map((table) => [...table.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height));
    const text = heights.map((h) => h.join(", "));
    const same = text.every((t) => t === text[0]);
    setReport(`Measured row heights: running ${text[0]}; held ${text[1]}; released ${text[2]}. ${same ? "Nothing moved: 0px." : "A row moved."}`);
  }, []);
  return (
    <div ref={frame} style={col}>
      <Caption>Running: the name over its step line.</Caption>
      <div data-two-line="" style={{ width: "100%" }}><Fit><TwoLineTable held={false} now={NOW} label="Two-line cells, running" /></Fit></div>
      <Caption>Held: the step line hides (visibility: hidden) and keeps its box, so no row moves.</Caption>
      <div data-two-line="" style={{ width: "100%" }}><Fit><TwoLineTable held now={NOW} label="Two-line cells, held" /></Fit></div>
      <Caption>Released: the current text is written into the same box.</Caption>
      <div data-two-line="" style={{ width: "100%" }}><Fit><TwoLineTable held={false} now={new Date(NOW.getTime() + 7 * 60 * 1000 + 2000)} label="Two-line cells, released" /></Fit></div>
      <Caption>{report}</Caption>
    </div>
  );
}

// ---- 1 and 2. the runs view, running and held

/** The view's control: a pressed-toggle Button in the head band, with a fixed name and `aria-pressed`. */
function ViewToggle() {
  const { held, setHeld } = useLoops();
  return <Button size="sm" aria-pressed={held} onClick={() => setHeld(!held)}>Pause animations</Button>;
}

function RunningToast() {
  const toast = useToast();
  React.useEffect(() => {
    // A shot shows the toast on its own; a live page waits for the button, so the specimen is not on top of the demo.
    if (isShot()) toast.show({ title: "Publishing web", description: "Uploading assets", running: true });
  }, [toast]);
  return <Button variant="secondary" onClick={() => toast.show({ title: "Publishing web", description: "Uploading assets", running: true })}>Show a running toast</Button>;
}

function ViewDemo() {
  const { held } = useLoops();
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      <Caption>{held ? "Held: every loop on the page is still, the toast's too. Nothing is hidden or swapped, and the words still say the work is running." : "Running. The toggle in the view's head holds every loop Basalt draws, portals included."}</Caption>
      <Card style={{ width: "100%" }}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <CardTitle>Runs</CardTitle>
            <ViewToggle />
          </div>
        </CardHeader>
        <CardContent>
          <div style={col}>
            <Fit><RunsTable held={held} now={NOW} label="Runs" /></Fit>
            <div style={{ ...row, gap: 24 }}>
              <Button loading>Deploying</Button>
              <span style={row}><Spinner label="Loading logs" /><Text as="span" size="sm" tone="secondary">Loading logs</Text></span>
              <RunningToast />
            </div>
            <div style={{ width: "100%", maxWidth: 420 }}>
              <Progress value={null} label="Preparing workspace" showValue={false} />
            </div>
            <Caption>{held ? "The indeterminate bar, held: the track only, the indicator hidden. It keeps its label and its indeterminate semantics." : "The indeterminate bar travels along its track. Held, it shows the empty track (a still bar would read as a value)."}</Caption>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24, width: "100%" }}>
              <div style={col}><Skeleton width="80%" /><Skeleton width="60%" /><Skeleton width="70%" /></div>
              <Sparkline data={[3, 5, 4, 8, 6, 9]} loading label="Runs per hour" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ViewRunning() {
  return <Fit><ViewDemo /></Fit>;
}

function ViewHeld() {
  useDemoHold(true);
  return <Fit><ViewDemo /></Fit>;
}

// ---- 3. the settings row and the command

function SettingsDemo({ state }: { state: string }) {
  useDemoHold(state.includes("held") ? true : undefined);
  const { held, setHeld } = useLoops();
  const [open, setOpen] = React.useState(state.startsWith("command"));
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      <Caption>The setting is a row, not a component: the label, the description and a Switch at its end.</Caption>
      <Card style={{ width: "100%" }}>
        <CardContent>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <Text as="div" weight="medium" id="pause-label">Pause animations</Text>
              <Text as="div" size="sm" tone="secondary" id="pause-description" style={{ maxWidth: 420 }}>Spinners hold still and timers show when work started. Your work keeps running.</Text>
            </div>
            <Switch checked={held} onCheckedChange={setHeld} aria-labelledby="pause-label" aria-describedby="pause-description" />
          </div>
        </CardContent>
      </Card>
      <Caption>The command reaches every page, and reads "Resume animations" while held</Caption>
      <div style={row}>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open the command menu</Button>
        <Text as="span" size="sm" tone="secondary">{held ? "Held" : "Running"}</Text>
      </div>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        groups={[{ label: "View", commands: [{ id: "loops", label: held ? "Resume animations" : "Pause animations", onSelect: () => setHeld(!held) }] }]}
      />
    </div>
  );
}

// ---- 4. the app's text before, during and after a hold

function TextDemo({ state }: { state: string }) {
  const { held, setHeld } = useLoops();
  React.useEffect(() => {
    // "scrolled" is the 390px view with each table moved to its Time and Step columns, where the held form is.
    if (state !== "scrolled") return undefined;
    const timer = window.setTimeout(() => document.querySelectorAll<HTMLElement>(".basalt-table-container").forEach((frame) => { frame.scrollLeft = frame.querySelectorAll<HTMLElement>("th")[2]?.offsetLeft ?? 0; }), 80);
    return () => window.clearTimeout(timer);
  }, [state]);
  // The live row ticks only while running, which is the app's part of the bargain; a shot freezes it.
  const [ticks, setTicks] = React.useState(0);
  React.useEffect(() => {
    if (held || isShot()) return undefined;
    const timer = window.setInterval(() => setTicks((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [held]);
  const live = new Date(NOW.getTime() + ticks * 1000);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      <Caption>Before: running. An elapsed time ticks, a streaming step line rewrites itself.</Caption>
      <Fit><RunsTable held={false} now={NOW} label="Before a hold" /></Fit>
      <Caption>During: held. An elapsed time shows when the work started (the clock for today, the date for another day). The step line hides, and the status word stays. The Failed and Passed rows are unchanged: a result is never held.</Caption>
      <Fit><RunsTable held now={NOW} label="During a hold" /></Fit>
      <Caption>After: released. The current text is written at once (seven minutes and two seconds later); nothing resumes from where it stopped.</Caption>
      <Fit><RunsTable held={false} now={new Date(NOW.getTime() + 7 * 60 * 1000 + 2000)} label="After a hold" /></Fit>
      <Caption>The same hold in a two-line cell, where the step line sits under the name instead of in a column of its own: it reserves its height.</Caption>
      <TwoLineDemo />
      <Caption>Live: this table ticks until you hold, then shows the start times.</Caption>
      <Fit><RunsTable held={held} now={live} label="Live runs" /></Fit>
      <Button variant="secondary" aria-pressed={held} onClick={() => setHeld(!held)}>Pause animations</Button>
    </div>
  );
}

// ---- 5. braille and the dot, at 16, 20 and 24, in mixed columns on whole pixels

const SIZES = [
  { size: 16 as const, type: "sm" as const, label: "16, beside 13px text", word: 12 },
  { size: 20 as const, type: "lg" as const, label: "20, beside 18px text", word: 18 },
  { size: 24 as const, type: "3xl" as const, label: "24, beside 30px text", word: 24 },
];

/** Fixed pixel columns, never fractions: a 20 or 24 mark on a fractional pixel blurs at 1x. */
const COLUMN = 232;

function SizesDemo() {
  const frame = React.useRef<HTMLDivElement>(null);
  const [report, setReport] = React.useState("");
  React.useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const reads = [...el.querySelectorAll<HTMLElement>("[data-kind]")].map((badge) => {
      const text = [...badge.childNodes].find((n) => n.nodeType === 3);
      const range = document.createRange();
      if (text) range.selectNodeContents(text);
      const mark = (badge.querySelector(".basalt-badge-dot") ?? badge.querySelector("svg"))!.getBoundingClientRect();
      const box = badge.getBoundingClientRect();
      return { word: range.getBoundingClientRect().left - box.left, whole: [mark.left, mark.top, mark.width, mark.height].every(Number.isInteger) };
    });
    const words = [...new Set(reads.map((r) => r.word))];
    setReport(`Measured: words start at ${words.join(", ")}px from their seat; every mark on whole pixels: ${reads.every((r) => r.whole) ? "yes" : "no"}.`);
  }, []);
  return (
    <div style={{ ...col, maxWidth: 760 }}>
      <Caption>Each column is {COLUMN}px; the dot and braille share one seat, so the word starts at one x.</Caption>
      <div ref={frame} style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, ${COLUMN}px)`, gap: 24, width: "100%" }}>
        {SIZES.map(({ size, type, label, word }) => (
          <div key={size} style={{ display: "flex", flexDirection: "column", gap: 8, width: COLUMN, fontSize: `var(--basalt-text-${type}-size)`, lineHeight: `var(--basalt-text-${type}-line-height)` }}>
            <Text as="div" size="sm" tone="secondary">{label}</Text>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
              <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: word, width: 1, background: "var(--basalt-border-divider)" }} />
              <div style={{ display: "flex" }}><Badge variant="plain" size={size} status="success" data-kind="dot">Passed</Badge></div>
              <div style={{ display: "flex" }}><Badge variant="plain" size={size} data-kind="braille"><Spinner variant="braille" />Running</Badge></div>
              <div style={{ display: "flex" }}><Badge variant="plain" size={size} status="pending" data-kind="pending">Queued</Badge></div>
              <div style={{ display: "flex" }}><Badge variant="plain" size={size} status="danger" data-kind="danger">Failed</Badge></div>
            </div>
          </div>
        ))}
      </div>
      <Caption>The hairline marks where the words start: 12, 18 and 24 from the seat's start whichever mark is in the seat.</Caption>
      <Caption>{report}</Caption>
    </div>
  );
}

export const ROUND_22: Round = {
  id: "22",
  title: "Pausing spinners, and the gap beside braille",
  reviewed: false,
  summary:
    "The council voted (DECISIONS 99, a three-member round: Muse's vote failed on its quota). One attribute, data-loops=\"held\" on the root, holds every loop Basalt draws, portals included; useLoops() keeps the state for this app's origin in this browser; the control is a pressed-toggle Button in the view, a settings row with a Switch, and a command; the app's own timers show when work started while held. Beside braille the seat is the cell's width and the gap equals it. This is the decided design built; neither the design panel nor the owner has reviewed this implementation. The indeterminate bar's held look is not decided.",
  steps: [
    {
      id: "view",
      name: "A runs view, running",
      intro: "Braille rows, a busy Button, a lone ring, the indeterminate bar, a skeleton, a loading line and a running toast, all moving; the view's head carries the toggle.",
      decisions: [
        "The control in a view (decided 2 to 1; Grok wanted one Switch at the head of the region): a pressed-toggle Button, secondary, in the head band of the view that shows running work, labelled \"Pause animations\" with a fixed name and aria-pressed. No new component.",
        "Reduced motion never turns the hold on: it is off by default for everyone, so a wait still looks alive for people who asked for less motion.",
        "Open for the owner: this toggle is drawn from the pressed-toggle Button already built (DECISIONS 95), unchanged.",
      ],
      tryIt: ["Press Pause animations: everything on the page stops, the toast too, and nothing is announced.", "Release: the spinners rejoin the shared clock, so two spinners mounted at different moments tick in phase.", "Show the running toast, then hold: its braille stops."],
      states: ["reduced-motion", "forced-colours"],
      demo: () => <ViewRunning />,
    },
    {
      id: "held",
      name: "The same view, held",
      intro: "data-loops=\"held\" on the root: braille holds its first frame, the ring stands still at its drawing at full opacity, a busy Button keeps its ring, and the Skeleton and the loading line stop.",
      decisions: [
        "The hold covers every Basalt loop (3 to 0): braille, the ring, a busy Button's ring, the indeterminate Progress bar, Sparkline's loading line and Skeleton's pulse. It is one rule, not a list, and it can't be set on a subtree.",
        "Held is one look whatever the OS says: it outranks reduced motion, and it stops the ring's reduced-motion fade too (the second screenshot of this step).",
        "Frozen, not hidden or swapped: a hidden mark leaves an empty seat that reads as a missing status, a dot reads as finished or queued, and a new \"paused\" glyph would say the work is paused, which is false.",
        "The indeterminate Progress bar, held (decided 2 to 1, DECISIONS 102; Opus wanted the bar across the track at 55% opacity): the track only, the indicator hidden, with or without reduced motion. A still bar reads as a value (30% done, or full width under reduced motion, which reads as done). The label still says the work is running and the semantics stay indeterminate (no aria-valuenow); a test matches the track's pixels to a determinate bar at 0.",
        "The toast's drain is a countdown, not a loop, so the hold does not stop it.",
      ],
      tryIt: ["Release with the toggle: every loop starts again on the shared clock.", "Compare with reduced motion alone: the ring still fades there; held stops it."],
      states: ["reduced-motion", "forced-colours"],
      demo: () => <ViewHeld />,
    },
    {
      id: "setting",
      name: "The setting and the command",
      intro: "The same words as a settings row with a Switch at its end, and as a command that reads \"Resume animations\" while held.",
      decisions: [
        "The words (3 to 0): \"Pause animations\", with \"Spinners hold still and timers show when work started. Your work keeps running.\"; the command reads \"Resume animations\" while held.",
        "Nothing extra is announced when the hold changes (3 to 0): the control speaks its own state, marks stay aria-hidden, and a labelled ring keeps its status role.",
        "The state is stored for this app's origin in this browser (localStorage is per origin, so it is not the user's setting everywhere), follows across the app's tabs by the storage event, and is applied before the first frame by a line the app inlines in its head, beside its theme's.",
      ],
      tryIt: ["Flip the Switch, then open the command menu: the command has flipped its label.", "Open this page in a second tab, flip it there, and come back."],
      states: ["command", "command-held"],
      demo: ({ state }) => <Fit><SettingsDemo state={state} /></Fit>,
    },
    {
      id: "text",
      name: "The app's own text",
      intro: "An elapsed time shows when the work started while held, and a streaming step line hides while the status word stays. On release the current text is written.",
      decisions: [
        "This is the app's part (3 to 0): Basalt ships the state (useLoops().held) and the words; the app writes its own rewriting text from it. Basalt does not own a clock or a timer component.",
        "While held an elapsed time reads \"Started 3:47 PM\" (the clock format of DECISIONS 94: the time for today, the date for another day, the year only when it differs); a streaming count or step line hides.",
        "A step line under a name (a two-line cell) hides with visibility: hidden while held (decided 3 to 0, DECISIONS 102): it keeps its box and leaves the accessibility tree, and on release the current text is written into the same box, so neither the hold nor its release moves a row. A step line in a column of its own just empties.",
        "A result lands as usual while held: the word turns to Passed or Failed and a toast speaks once.",
        "A column that holds an elapsed time is wide enough for its held form: \"Started Nov 9, 9:12 PM\" is about 150px at 13px, so the Time column is 176px.",
      ],
      tryIt: ["Hold in the live table: the times turn to start times and the Step column empties.", "Release: the current times are written at once."],
      states: ["scrolled", "reduced-motion"],
      demo: ({ state }) => <Fit><TextDemo state={state} /></Fit>,
    },
    {
      id: "sizes",
      name: "Braille and the dot at 16, 20 and 24",
      intro: "The seat is the braille cell's width at each size and the gap equals it, so the word starts at 12, 18 and 24 whichever mark is in the seat.",
      decisions: [
        "The gap equals the seat (3 to 0): 6, 9 and 12px, written as size-dot times 1, 1.5 and 2, with no new token. Size 16 changes no pixel.",
        "The 6px dot stays 6px and centres in the wider seat on whole pixels (3 to 0): 1 + 6 + 2 at 20, 3 + 6 + 3 at 24.",
        "The size follows the word's cap height (3 to 0): 16 beside 12 to 16px text, 20 beside 18 to 24px, 24 beside 30px and up.",
        "The 20 cell (9 by 15) sits in a 9 by 16 box, one hairline below, and centres (3 to 0), so it lands on whole pixels in any even line.",
        "A plain Badge takes the size and sets the seat and the gap; a running status is a plain Badge whose first child is braille, which takes the badge's size so the two cannot disagree. The toast's 16px mark seat is unchanged.",
        "The columns here are 232px, not fractions of the page: a mark on a fractional pixel blurs at 1x (the prototype's defect, not copied).",
      ],
      tryIt: ["Zoom to 100% on a 1x screen: no mark is blurred.", "Compare the dot and braille rows: the word never moves."],
      states: ["reduced-motion", "forced-colours"],
      demo: () => <Fit><SizesDemo /></Fit>,
    },
  ],
};
