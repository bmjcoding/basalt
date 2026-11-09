// Round 13: braille for a running status, the ring for a wait. The council converged and the owner approved
// (decisions 51 and 52); this is that design built as decided. The design panel has not reviewed this
// implementation. The status mark is composed by hand here: Basalt has no status helper, and this round adds none.
//
// The states "reduced-motion", "forced-colours" and "forced-mixed" are real emulations (build.mjs sets the media
// features before the page loads). "forced-mixed" is a light authored theme under a dark forced palette, and the
// reverse: the case where an authored colour used to leave the dots near invisible.

import * as React from "react";

import {
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "../../packages/react/src/index";
import { CommandMenuShell } from "../../packages/react/src/command";
import type { PanelState } from "../../packages/react/src/command";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

type Status = "running" | "passed" | "failed" | "blocked";

const WORD: Record<Status, string> = { running: "Running", passed: "Passed", failed: "Failed", blocked: "Blocked" };
const DOT = { passed: "success", failed: "danger", blocked: "warning" } as const;

/**
 * A status word and its mark. The finished statuses are Basalt's plain Badge: the 6px dot, a 6px gap, the word. Running
 * reuses that Badge's own layout with braille in the dot's seat, so "Running" starts at the same x as "Passed" and the
 * mark is centred on the line the way the dot is. Not a component Basalt ships: this round draws the composition only.
 */
function StatusMark({ status }: { status: Status }) {
  if (status !== "running") return <Badge variant="plain" status={DOT[status]}>{WORD[status]}</Badge>;
  return (
    <span className="basalt-badge" data-variant="plain" data-status="neutral">
      <Spinner variant="braille" />
      {WORD.running}
    </span>
  );
}

const RUNS: Array<{ id: string; name: string; agent: string; time: string; status: Status }> = [
  { id: "run-0146", name: "blacksand-api", agent: "claude", time: "0:42", status: "running" },
  { id: "run-0145", name: "docs-site", agent: "codex", time: "1:18", status: "running" },
  { id: "run-0144", name: "basalt-tokens", agent: "claude", time: "4m 12s", status: "passed" },
  { id: "run-0143", name: "checkout-flow", agent: "codex", time: "11m 03s", status: "failed" },
  { id: "run-0142", name: "billing-sync", agent: "claude", time: "2m 50s", status: "blocked" },
];

// ---- 1. Braille beside a word

function RunsTable() {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {RUNS.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell><StatusMark status={r.status} /></TableCell>
              <TableCell>{r.agent}</TableCell>
              <TableCell>{r.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ListRow({ name, meta, status }: { name: string; meta: string; status: Status }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", boxShadow: "inset 0 -1px 0 var(--basalt-border-divider)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: "var(--basalt-font-weight-medium)" as unknown as number }}>{name}</span>
        <Text size="sm" tone="secondary">{meta}</Text>
      </div>
      <StatusMark status={status} />
    </div>
  );
}

function StatusDemo() {
  return (
    <div style={col}>
      <Caption>A runs table: Running ×2, Passed, Failed, Blocked. The words start at one x.</Caption>
      <div style={{ width: "100%" }}><RunsTable /></div>
      <Caption>A list row</Caption>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <ListRow name="blacksand-api" meta="claude · started 0:42 ago" status="running" />
        <ListRow name="basalt-tokens" meta="claude · 4m 12s" status="passed" />
      </div>
      <Caption>A log line</Caption>
      <div style={{ ...row, gap: "var(--basalt-space-1-5)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 13, lineHeight: "20px" }}>
        <Spinner variant="braille" />
        <span>Building blacksand-api 0:42</span>
      </div>
    </div>
  );
}

// ---- 2. The ring keeps the waits

type Shown = "loading" | null;

function WaitsDemo({ state }: { state: string }) {
  const [shown, setShown] = React.useState<Shown>(state === "loading" ? "loading" : null);
  const loading: PanelState = { status: "loading" };
  return (
    <div style={col}>
      <Caption>A busy button keeps the ring, in text-secondary or inherited from the button.</Caption>
      <div style={row}>
        <Button loading>Saving</Button>
        <Button variant="primary" loading>Deploying</Button>
      </div>
      <Caption>The command menu's loading slot keeps the ring too (it appears after 300ms).</Caption>
      <div style={row}>
        <Button onClick={() => setShown("loading")}>Open the loading menu</Button>
        <Spinner label="Loading runs" />
        <Text size="sm" tone="secondary">A ring on its own, with no visible word, names itself.</Text>
      </div>
      <CommandMenuShell open={shown !== null} onOpenChange={(open) => !open && setShown(null)} groups={[]} state={loading} retry={() => {}} />
    </div>
  );
}

// ---- 3. Sizes and frames

/** Holds each tile on its own frame (⠋ to ⠏) by seeking its paused animations to the middle of that frame. */
function FrameTile({ frame, size }: { frame: number; size: 16 | 20 | 24 }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    for (const a of ref.current?.getAnimations({ subtree: true }) ?? []) {
      a.pause();
      a.currentTime = frame * 80 + 40;
    }
  }, [frame]);
  return <span ref={ref} style={{ display: "inline-flex" }}><Spinner variant="braille" size={size} /></span>;
}

const GLYPHS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function SizesDemo({ state }: { state: string }) {
  return (
    <div style={col}>
      <Caption>Braille at 16, 20 and 24, each with a word at a size it suits (14, 18 and 20px).</Caption>
      {([[16, 14, 20], [20, 18, 26], [24, 20, 28]] as const).map(([size, font, line]) => (
        <div key={size} style={{ ...row, gap: "var(--basalt-space-1-5)", fontSize: font, lineHeight: `${line}px` }}>
          <Spinner variant="braille" size={size} />
          <span>Running · size {size}</span>
        </div>
      ))}
      {state === "frames" ? (
        <>
          <Caption>The ten frames, held, at each size</Caption>
          {([16, 20, 24] as const).map((size) => (
            <div key={size} style={{ ...row, gap: 20 }}>
              {GLYPHS.map((g, i) => (
                <div key={g} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <FrameTile frame={i} size={size} />
                  <span className="wt-caption">{g}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

export const ROUND_13: Round = {
  id: "13",
  title: "Braille for a status, the ring for a wait",
  reviewed: false,
  summary:
    "The council converged on one job per spinner, and the owner approved it (decisions 51 and 52): the ring is for a wait, braille is for a status beside a word. Braille is redrawn as Basalt's own six-dot cell, 6 by 10, and runs ten frames in 800ms. This is that design built as decided. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "status",
      name: "Braille beside a word",
      intro: "Work that runs while a word beside it says so: a table, a list row, a log line. The mark takes the status dot's seat and gap, in its word's colour.",
      decisions: [
        "Approved: braille is the six dots the ten frames use (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏), 6 by 10 with 2px dots on whole pixels. Dots 7 and 8 are gone, and unlit dots are not drawn (opacity 0, not 0.2).",
        "800ms a cycle, 80ms a frame, on duration-loop-braille (it was 530ms), hard step-end. Under reduced motion it holds ⠋.",
        "Colour is the word's: color inherit. Beside a status dot it is the same 6px wide with the same 6px gap, so Running, Passed, Failed and Blocked start at one x; the mark is centred on the line the way the dot is.",
        "Forced colours: the dots are left to the browser, which forces the word's colour to the system foreground of its surface. The earlier prototype switched that off and an authored colour won. Check the mixed state: a light authored theme under a dark forced palette.",
        "Spinners on a page share one clock: each animation starts at the document timeline's origin, set once at mount, so the two Running rows tick together, and a row mounted later joins in phase. No ticker and no re-render.",
        "There is no status helper and Toast has no running state; neither is added. The composition here is drawn by hand.",
      ],
      tryIt: [
        "Watch the two Running rows: they step together.",
        "Compare the x of Running with Passed.",
        "Turn on reduced motion: braille holds ⠋. Turn on forced colours: the dots follow the words.",
      ],
      states: ["reduced-motion", "forced-colours", "forced-mixed"],
      demo: () => <StatusDemo />,
    },
    {
      id: "waits",
      name: "The ring keeps the waits",
      intro: "A button that is busy, the command menu's loading slot, or a spinner with no word beside it is a wait, and stays the ring.",
      decisions: [
        "Approved: the ring is the default, and it keeps text-secondary. Braille is never in a button and never without its word.",
        "The ring's drawing is unchanged. It joins the shared clock, on its own 640ms period.",
        "Under reduced motion the ring fades on duration-loop-fade (council 3 to 1); braille holds its first frame.",
      ],
      tryIt: ["Open the loading menu and wait 300ms.", "Turn on reduced motion: the ring fades."],
      states: ["loading", "reduced-motion"],
      demo: ({ state }) => <WaitsDemo state={state} />,
    },
    {
      id: "sizes",
      name: "Sizes and frames",
      intro: "The default size is 6 by 10, for text up to 14px. Larger sizes scale on whole pixels: 9 by 15 with 3px dots, and 12 by 20 with 4px dots.",
      decisions: [
        "The square size box no longer applies to braille. The council has not seen sizes 20 and 24 before this round; they are an engineering extension of the approved 6 by 10 cell and need a look.",
        "Left open: the approved design fixes the gap only at the default size (the status dot's 6px). The 20 and 24 rows here keep that same 6px gap, and the word sizes beside them (14, 18 and 20px) are only an illustration. Whether the gap should grow with the mark is for the panel to decide; nothing was decided here.",
      ],
      tryIt: ["Compare the three sizes against their words.", "Look at the ten held frames."],
      states: ["frames", "reduced-motion"],
      demo: ({ state }) => <SizesDemo state={state} />,
    },
  ],
};
