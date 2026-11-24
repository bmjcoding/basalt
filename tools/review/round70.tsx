// Round 70: the timeline's cut-off top row (DECISIONS 337, a light council round). The owner asked for a fade in place of the hard cut and handed it to
// the council ("Council picks"): Opus drafted, Astra checked, Opus decided and revised after the final positions. Built by Opus from the revised decision.
// The build has not been reviewed; the browser tests were written but not run (DECISIONS 330).
//
// Each step draws the shipped agent run twice, at its end: today's edge (main) and this build's. Today's is the same component with the mask taken off
// (the build's only paint is that mask; the attribute and the length it writes are read by nothing else), so the two sides differ only where the build
// does. Side by side from 720, today's above this build's under it. Media states are the build's own emulations.

import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import * as React from "react";

import { Card, RunStep, RunTimeline, RunTimer, StageBadge } from "../../packages/react/src/index";
import type { StageState } from "../../packages/react/src/index";
import type { Round } from "./rounds";

interface Item { id: string; state?: StageState; word?: string; text: React.ReactNode; meta?: string; ms?: number; detail?: string }
const T0 = Date.UTC(2026, 10, 23, 14, 30);
const logs: Item = { id: "logs", state: "failed", text: <>Searched logs for <code>"pool timeout"</code></>, meta: "Timed out after 10 s", ms: 1500 };
const deploys: Item = { id: "deploys", state: "success", text: <>Listed deploys of <code>payments-api</code></>, meta: "4f2a1c0 at 14:02", ms: 800 };
/** The run at its end. The failed step is the cut row (depth 3); `passed` swaps it with the deploys step, so a passed step is cut and the failure is whole at depth 2. */
const run = (cut: "failed" | "passed"): Item[] => [
  { id: "read", state: "success", text: <>Read <code>deploy/payments-api.yaml</code></>, meta: "84 lines", ms: 700 },
  { id: "p99", state: "success", text: <>Queried <code>p99 latency · payments-api · 2 h</code></>, meta: "p99 1.8 s since 14:05", ms: 1400 },
  ...(cut === "failed" ? [logs, deploys] : [deploys, logs]),
  { id: "finding", word: "Finding", text: "Connection pool exhausted after deploy 4f2a1c0", meta: "High confidence" },
  { id: "approve", state: "success", word: "Approved by Priya Shah", text: "Roll back payments-api to 4f29e0b", meta: "Medium risk", ms: 2600, detail: "kubectl rollout undo deployment/payments-api -n payments" },
  { id: "rollback", state: "success", text: <>Ran <code>kubectl rollout undo deployment/payments-api</code></>, meta: "Rolled back to 4f29e0b", ms: 2200 },
  { id: "check", state: "success", text: <>Queried <code>p99 latency · last 10 min</code></>, meta: "p99 240 ms", ms: 1100 },
];

const head: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--basalt-space-2) var(--basalt-space-3)", marginBlockEnd: "var(--basalt-space-3)" };
const title: React.CSSProperties = { margin: 0, font: "var(--basalt-font-weight-medium) var(--basalt-text-sm-size) / var(--basalt-text-sm-line-height) var(--basalt-font-family-sans)" };
const line: React.CSSProperties = { margin: "0 0 var(--basalt-space-3)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-tertiary)" };
const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };

function Agent({ cut, today }: { cut: "failed" | "passed"; today: boolean }) {
  let t = T0;
  return (
    <div className={today ? "r70-today" : undefined} style={{ minWidth: 0 }}>
      <p style={label}>{today ? "Today (main): the hard cut" : "This build: the cut row fades"}</p>
      <Card style={{ padding: "var(--basalt-space-5)", display: "flex", flexDirection: "column" }}>
        <div style={head}>
          <h3 style={title}>INC-0042 · Payments API latency</h3>
          <StageBadge state="success" words={{ success: "Completed" }} />
          <span style={{ marginInlineStart: "auto" }}><RunTimer start={T0} end={T0 + 14_300} /></span>
        </div>
        <p style={line}>Rolled back; p99 is back to 240 ms.</p>
        <RunTimeline label={today ? "Agent steps, today" : "Agent steps"}>
          {run(cut).map((x) => {
            const start = t;
            t += x.ms ?? 0;
            return (
              <RunStep key={x.id} state={x.state} mark={x.state ? undefined : FlagIcon} word={x.word} meta={x.meta} start={x.state ? start : undefined} end={x.state ? t : undefined} detail={x.detail ? <code>{x.detail}</code> : undefined}>
                {x.text}
              </RunStep>
            );
          })}
        </RunTimeline>
      </Card>
    </div>
  );
}

function Pair({ state }: { state: string }) {
  const cut = state.startsWith("passed") ? "passed" : "failed";
  return (
    <div className="r70-pair">
      {/* Today's edge: the build's one paint taken off, scoped to the left card. */}
      <style>{".r70-today .basalt-run-step { mask-image: none !important; } .r70-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r70-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }"}</style>
      <Agent cut={cut} today />
      <Agent cut={cut} today={false} />
    </div>
  );
}

const DECISIONS = [
  "The window's top edge fades the one tail row it cuts, over exactly the part that shows: transparent at the edge, opaque at the row's bottom (--_cut, its visible height, measured; 10px at the run's end). Nothing whole is ever faded.",
  "Only a finished tail row at the second step or deeper (depth 2 to 5), only when the edge crosses its words (more than space-0-5 of it shows and more than space-0-5 is above), never a row holding focus, never while a step rolls in. Anything else at the top keeps today's hard cut.",
  "The mask is on that row alone, so it moves with the row: a scroll frame painted before the component measures can misplace the fade only inside that one row. The stylesheet's selector is the guard, so no attribute can mask a running, waiting or retrying step, a full row or a depth-1 row.",
  "The window keeps its own +2 focus ring (no mask is on it, no frame around it). Reduced motion and the hold keep the fade (it is still); more contrast, forced colours and print are a plain cut, and so is an open tail or keep={false}.",
  "Where the failure is the cut row its red fragment dissolves into the edge; where it is whole (the passed-cut case) it keeps its muted red, untouched. The toggle still says \"Show 5 earlier steps, 1 failed\".",
  "Not reviewed after the build. Tests 1 to 9 of the decision are written and not run (browser tests are paused, DECISIONS 330).",
];
const TRY = [
  "Compare the two cards' top edges: the left is today's, the right this build's.",
  "Scroll the right card's window: the fade follows the row the edge cuts, and goes when that row is depth 1, a full step or only its padding is cut.",
  "Tab to the window: its ring is today's. Open the tail: no fade.",
];

export const ROUND_70: Round = {
  id: "70",
  title: "The timeline's cut-off top row (DECISIONS 337)",
  reviewed: false,
  summary:
    "RunTimeline's window now fades the tail row its top edge cuts, from the second step, in place of the hard cut (the owner: \"this might look better if we fade the top of that last row rather than the hard cut off\", then \"Council picks\"). Decided by a light council round (Opus drafted, Astra checked, Opus decided and revised after the positions); built by Opus; not reviewed after the build; the browser tests are written and not run. Each step shows the shipped agent run at its end, today's edge beside this build's, at 1440 and 390 in both themes, with forced colours and more contrast.",
  steps: [
    {
      id: "failed-cut",
      name: "The agent run at its end",
      intro: "The run's end: by default the failed step (depth 3) is the row the window's top edge cuts; in the passed state a passed step is, and the failure is whole under it. Today's on the left (above on a phone), this build's on the right.",
      decisions: DECISIONS,
      tryIt: TRY,
      states: ["passed", "forced-colours", "more-contrast"],
      widths: [1440, 390],
      height: 1200,
      demo: ({ state }) => <Pair state={state} />,
    },
  ],
};
