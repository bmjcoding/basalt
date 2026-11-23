// Round 67: stage animations (DECISIONS 302, 304, 307, 312 and 316). The owner confirmed a prototype; the council's heavy round reviewed it (Astra checked,
// Fable decided, revised after the final positions) and this is the build of that decision, by Opus. Not reviewed: no panel or council member has read the
// build yet. Synthetic, CIMIP-like content only.
//
// Each step is a run that plays when the walkthrough opens it (Replay plays it again; a run the reader starts plays whatever the hold, and a page's own run
// does not start under it). A shot (?shot=1) poses the run at a chosen moment: every step up to it is applied at once, with its times as they would be.

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import * as React from "react";

import {
  Button,
  Card,
  LoopsToggle,
  Progress,
  RunAnnouncer,
  RunStage,
  RunStep,
  RunTimeline,
  RunTimer,
  StageBadge,
  StageList,
  StageMark,
  StageRail,
  Terminal,
  useLoops,
} from "../../packages/react/src/index";
import type { RunEvent, StageState, TerminalLine } from "../../packages/react/src/index";
import type { Round } from "./rounds";
import connectorDark from "./assets/round-67/connector-before-dark.png";
import connectorLight from "./assets/round-67/connector-before-light.png";
import heldDark1440 from "./assets/round-67/held-before-dark-1440.png";
import heldDark390 from "./assets/round-67/held-before-dark-390.png";
import heldLight1440 from "./assets/round-67/held-before-light-1440.png";
import heldLight390 from "./assets/round-67/held-before-light-390.png";
import logDark from "./assets/round-67/log-before-dark.png";
import logLight from "./assets/round-67/log-before-light.png";
import queuedDark from "./assets/round-67/queued-before-dark.png";
import queuedLight from "./assets/round-67/queued-before-light.png";
import tailDark1440 from "./assets/round-67/tail-before-dark-1440.png";
import tailDark390 from "./assets/round-67/tail-before-dark-390.png";
import tailLight1440 from "./assets/round-67/tail-before-light-1440.png";
import tailLight390 from "./assets/round-67/tail-before-light-390.png";

const isShot = () => typeof location !== "undefined" && new URLSearchParams(location.search).get("shot") === "1";
const W = [1440, 390];

// ---- a run, as timed steps over a state

interface Step<S> { at: number; apply: (s: S, now: number) => S }

/**
 * Plays `steps` over `initial`. Live, each step lands at its time from the start, one timer at a time; posed (a shot, or a page held when the run
 * would start), every step up to `pose` lands at once with the time it would have had. A page's own run asks the hold at the moment its first step
 * would land, and does not start under it (it shows where the run ends); `replay` is the reader's own start and runs whatever the hold. `pace` plays it
 * faster, for a shot of a run that played to its end.
 */
function useRun<S>(initial: S, steps: Step<S>[], pose: number, { played = false } = {}) {
  const [state, setState] = React.useState(initial);
  const timer = React.useRef(0);
  const clear = () => window.clearTimeout(timer.current);
  const posed = React.useCallback((upTo: number) => {
    clear();
    const base = Date.now() - steps[upTo]!.at;
    let s = initial;
    for (let i = 0; i <= upTo; i += 1) s = steps[i]!.apply(s, base + steps[i]!.at);
    setState(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = React.useCallback((reader: boolean, pace = 1) => {
    clear();
    setState(initial);
    const t0 = Date.now();
    const next = (i: number) => {
      const step = steps[i];
      if (!step) return;
      const wait = Math.max(0, (step.at - (i ? steps[i - 1]!.at : 0)) * pace);
      timer.current = window.setTimeout(() => {
        if (i === 0 && !reader && document.documentElement.getAttribute("data-loops") === "held") { posed(steps.length - 1); return; }
        setState((s) => step.apply(s, t0 + step.at * pace));
        next(i + 1);
      }, wait);
    };
    next(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const play = React.useCallback(() => run(true), [run]);
  React.useEffect(() => {
    if (isShot() && played) run(false, 0.12);
    else if (isShot()) posed(pose);
    else run(false);
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose, played]);
  return { state, play, setState };
}

/** The held state: the hold set before the step draws, and taken off when it goes. */
function useHeldState(state: string) {
  React.useLayoutEffect(() => {
    if (!state.startsWith("held")) return undefined;
    const root = document.documentElement;
    root.setAttribute("data-loops", "held");
    return () => root.removeAttribute("data-loops");
  }, [state]);
}

const head: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", marginBottom: 16 };
const title: React.CSSProperties = { margin: 0, font: "500 13px / 18px var(--basalt-font-family-sans)" };
const pad: React.CSSProperties = { padding: 20, display: "flex", flexDirection: "column" };
const timeEnd: React.CSSProperties = { marginInlineStart: "auto" };

/** Replay and the page's hold, side by side in each run's head (the hold is the walkthrough's: every run on the page follows it). */
function Replay({ onClick }: { onClick: () => void }) {
  return <span style={{ display: "inline-flex", gap: 8 }}><Button size="sm" variant="ghost" icon={ArrowClockwiseIcon} onClick={onClick}>Replay</Button><LoopsToggle form="button" size="sm" /></span>;
}

// ---- 1. The stage list: Deploy 812, Test fails, Retry, the retry passes

interface ListRun { run: StageState; attempt: number; start?: number; end?: number; carried?: number; since?: number; stages: { name: string; meta: string; state: StageState; word?: string; start?: number; end?: number }[]; detail: boolean; events: RunEvent[] }
const LIST_NAMES = [["Clone", "main@4f2a1c0"], ["Install", "412 packages"], ["Build", "142 routes"], ["Test", "unit and e2e"], ["Deploy", "production"], ["Promote", "basalt-sra.example"]] as const;
const setStage = (s: ListRun, i: number, patch: Partial<ListRun["stages"][number]>): ListRun => ({ ...s, stages: s.stages.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
const say = (s: ListRun, id: string, text: string) => ({ ...s, events: [...s.events, { id, text }] });
const LIST_START: ListRun = { run: "queued", attempt: 1, stages: LIST_NAMES.map(([name, meta]) => ({ name, meta, state: "queued" as StageState })), detail: false, events: [] };
function stageSteps(): Step<ListRun>[] {
  const steps: Step<ListRun>[] = [{ at: 400, apply: (s, now) => say({ ...s, run: "running", start: now, since: now }, "start", "Deploy 812 started") }];
  let at = 400;
  for (const [i, ms] of [[0, 800], [1, 1600], [2, 2100]] as const) {
    steps.push({ at, apply: (s, now) => setStage(s, i, { state: "running", start: now }) });
    at += ms;
    steps.push({ at, apply: (s, now) => setStage(s, i, { state: "success", end: now }) });
  }
  steps.push({ at, apply: (s, now) => setStage(s, 3, { state: "running", start: now }) });
  at += 1400;
  steps.push({ at, apply: (s, now) => say({ ...setStage(setStage(setStage(s, 3, { state: "failed", end: now }), 4, { state: "skipped", word: "Blocked by Test" }), 5, { state: "skipped", word: "Blocked by Test" }), run: "failed", end: now, detail: true }, "fail", "Test failed: 3 tests failed in session.test.ts. Retry is available.") });
  at += 2600;
  // The run retries by itself after a while (someone else pressed Retry), unless the reader already has.
  steps.push({ at, apply: (s, now) => s.stages[3]!.state !== "failed" ? s : say({ ...setStage(setStage(setStage(s, 3, { state: "retrying", word: "Retrying, 2 of 2", start: now, end: undefined }), 4, { state: "queued", word: undefined }), 5, { state: "queued", word: undefined }), run: "retrying", attempt: 2, carried: (s.end ?? now) - (s.start ?? now), start: now, end: undefined, detail: false }, "retry", "Retrying Test, attempt 2 of 2") });
  at += 1900;
  steps.push({ at, apply: (s, now) => ({ ...setStage(s, 3, { state: "success", word: undefined, end: now }), run: "running" }) });
  for (const [i, ms] of [[4, 1200], [5, 600]] as const) {
    steps.push({ at, apply: (s, now) => setStage(s, i, { state: "running", start: now }) });
    at += ms;
    steps.push({ at, apply: (s, now) => setStage(s, i, { state: "success", end: now }) });
  }
  steps.push({ at, apply: (s, now) => say({ ...s, run: "success", end: now }, "end", `Deploy 812 passed in ${(((now - (s.start ?? now)) + (s.carried ?? 0)) / 1000).toFixed(1)} seconds`) });
  return steps;
}
const LIST_STEPS = stageSteps();
const LIST_POSES: Record<string, number> = { default: 8, failed: 8, passed: LIST_STEPS.length - 1, retrying: 9 };

function DeployList({ state }: { state: string }) {
  useHeldState(state);
  const pose = LIST_POSES[state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "").replace(/^held-?/, "") || "default"] ?? 8;
  const { state: run, play, setState } = useRun(LIST_START, LIST_STEPS, pose);
  const retry = () => new Promise<void>((resolve) => window.setTimeout(() => { setState((s) => LIST_STEPS[9]!.apply(s, Date.now())); resolve(); }, 300));
  return (
    <Card style={pad}>
      <div style={head}>
        <h3 style={title}>Deploy #812</h3>
        <StageBadge state={run.run} words={{ retrying: "Retrying, 2 of 2" }} />
        <span style={timeEnd}><RunTimer start={run.start} end={run.end} carried={run.carried} since={run.since} /></span>
        <Replay onClick={play} />
      </div>
      <StageList label="Deploy 812 stages">
        {run.stages.map((s, i) => (
          <RunStage key={s.name} name={s.name} state={s.state} word={s.word} meta={s.meta} start={s.start} end={s.end}
            detail={i === 3 && run.detail ? <><p><strong>3 tests failed</strong> in <code>session.test.ts</code></p><small>Exit 1 · attempt 1 of 2</small></> : undefined}
            action={i === 3 && run.detail ? <Button size="sm" variant="secondary" icon={ArrowClockwiseIcon} onClick={retry}>Retry</Button> : undefined} />
        ))}
      </StageList>
      <RunAnnouncer label="Deploy 812 updates" events={run.events} />
    </Card>
  );
}

// ---- 2. The rail: release v2.14.0, the link fills, the ring alone

interface RailRun { run: StageState; start?: number; end?: number; nodes: { name: string; state: StageState; word?: string; start?: number; end?: number }[]; events: RunEvent[] }
const RAIL_START: RailRun = { run: "queued", nodes: ["Build", "Checks", "Deploy", "Promote"].map((name) => ({ name, state: "queued" as StageState })), events: [] };
const setNode = (s: RailRun, i: number, patch: Partial<RailRun["nodes"][number]>): RailRun => ({ ...s, nodes: s.nodes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
function railSteps(): Step<RailRun>[] {
  const steps: Step<RailRun>[] = [{ at: 400, apply: (s, now) => ({ ...s, run: "running", start: now, events: [...s.events, { id: "start", text: "Release v2.14.0 started" }] }) }];
  let at = 400;
  for (const [i, ms] of [[0, 2100], [1, 2600], [2, 1500], [3, 700]] as const) {
    steps.push({ at, apply: (s, now) => setNode(s, i, { state: "running", start: now }) });
    at += ms;
    steps.push({ at, apply: (s, now) => setNode(s, i, { state: "success", end: now }) });
  }
  steps.push({ at, apply: (s, now) => ({ ...s, run: "success", end: now, events: [...s.events, { id: "end", text: `Release v2.14.0 passed in ${((now - (s.start ?? now)) / 1000).toFixed(1)} seconds` }] }) });
  return steps;
}
const RAIL_STEPS = railSteps();

function ReleaseRail({ state }: { state: string }) {
  useHeldState(state);
  const name = state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "");
  const played = useRun(RAIL_START, RAIL_STEPS, name === "passed" ? RAIL_STEPS.length - 1 : 3);
  const { play } = played;
  // "words": the status seat holding words (a failed, a retrying and a canceled node beside a passed one), the picture the pixel review asked for.
  const [wordsAt] = React.useState(() => Date.now());
  const run: RailRun = name === "words" ? { run: "failed", start: wordsAt - 9000, end: wordsAt - 4500, events: [], nodes: [
    { name: "Build", state: "success", start: wordsAt - 9000, end: wordsAt - 6900 },
    { name: "Checks", state: "failed", start: wordsAt - 6900, end: wordsAt - 4500 },
    { name: "Deploy", state: "skipped" },
    { name: "Promote", state: "canceled" },
  ] } : played.state;
  const done = run.nodes.filter((n) => n.state === "success").length;
  const running = run.nodes.find((n) => n.state === "running")?.name;
  return (
    <Card style={pad}>
      <div style={head}>
        <h3 style={title}>Release v2.14.0</h3>
        <StageBadge state={run.run} words={{ running: "In progress" }} />
        <span style={timeEnd}><RunTimer start={run.start} end={run.end} /></span>
        <Replay onClick={play} />
      </div>
      <StageRail label="Release v2.14.0 stages">
        {run.nodes.map((n) => <RunStage key={n.name} name={n.name} state={n.state} word={n.word} start={n.start} end={n.end} />)}
      </StageRail>
      <div style={{ marginTop: 24 }}>
        <Progress label={running ? `${running} running` : run.run === "success" ? "All stages passed" : "Waiting for a runner"} value={done} max={4} getAriaValueText={() => `${done} of 4 stages`} />
      </div>
      <RunAnnouncer label="Release v2.14.0 updates" events={run.events} />
    </Card>
  );
}

// ---- 3. The deploy log: a declared stage transcript, keep 3

interface LogRun { status: "idle" | "running" | "done"; start?: number; end?: number; lines: TerminalLine[]; events: RunEvent[] }
const LOG_START: LogRun = { status: "idle", lines: [], events: [] };
function logSteps(): Step<LogRun>[] {
  const steps: Step<LogRun>[] = [{ at: 400, apply: (s, now) => ({ ...s, status: "running", start: now, lines: [{ kind: "command", text: "basalt deploy --prod" }], events: [{ id: "start", text: "Deploy to production started" }] }) }];
  let at = 700;
  const stage = (running: string, done: string, ms: number, out: string[] = []) => {
    const index = { current: -1 };
    steps.push({ at, apply: (s, now) => { index.current = s.lines.length; return { ...s, lines: [...s.lines, { kind: "stage", state: "running", text: running, start: now }] }; } });
    out.forEach((o, k) => steps.push({ at: at + ((k + 1) * ms) / (out.length + 1), apply: (s) => ({ ...s, lines: [...s.lines, { kind: "output", text: o }] }) }));
    at += ms;
    steps.push({ at, apply: (s, now) => ({ ...s, lines: s.lines.map((l, i) => (i === index.current ? { ...l, state: "done", text: done, end: now } : l)) }) });
  };
  stage("Cloning main@4f2a1c0", "Cloned main@4f2a1c0", 700);
  steps.push({ at, apply: (s) => ({ ...s, lines: [...s.lines, { kind: "stage", state: "skipped", text: "cache restore (no cache)" }] }) });
  stage("Installing packages", "Installed 412 packages", 1700);
  stage("Running bun run build", "Built 142 routes", 2300, ["Compiled 142 routes", "Generated static pages 38/38"]);
  stage("Uploading artifacts", "Uploaded 3 artifacts", 900);
  stage("Promoting to production", "Promoted to production", 500);
  at += 250;
  steps.push({ at, apply: (s, now) => ({ ...s, status: "done", end: now, lines: [...s.lines, { kind: "done", text: "Ready  https://basalt-sra.example" }], events: [...s.events, { id: "end", text: `Deployed to production in ${((now - (s.start ?? now)) / 1000).toFixed(1)} seconds` }] }) });
  return steps;
}
const LOG_STEPS = logSteps();

function DeployLog({ state }: { state: string }) {
  useHeldState(state);
  const name = state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "");
  const { state: run, play } = useRun(LOG_START, LOG_STEPS, name === "passed" ? LOG_STEPS.length - 1 : LOG_STEPS.length - 3);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div><Replay onClick={play} /></div>
      <Terminal title="Deploy · basalt-sra" stages keep={3} status={run.status === "idle" ? undefined : run.status} time={{ start: run.start, end: run.end }} lines={run.lines} />
      <RunAnnouncer label="Deploy updates" events={run.events} />
    </div>
  );
}

// ---- 4. The CI job list: statuses that change in place

interface Job { name: string; meta: string; state: StageState; start?: number; end?: number }
interface JobsRun { jobs: Job[]; events: RunEvent[] }
const JOBS_START: JobsRun = { jobs: [["Lint", "eslint, stylelint"], ["Typecheck", "tsc"], ["Unit tests", "node 22"], ["End-to-end", "chromium"], ["Build image", "linux/arm64"], ["Migrate database", "staging"]].map(([name, meta]) => ({ name: name!, meta: meta!, state: "queued" as StageState })), events: [] };
const setJob = (s: JobsRun, i: number, p: Partial<Job>): JobsRun => ({ ...s, jobs: s.jobs.map((j, k) => (k === i ? { ...j, ...p } : j)) });
const JOBS_STEPS: Step<JobsRun>[] = [
  { at: 500, apply: (s, now) => ({ ...setJob(setJob(setJob(setJob(s, 0, { state: "running", start: now }), 1, { state: "running", start: now }), 2, { state: "running", start: now }), 5, { state: "skipped" }), events: [{ id: "start", text: "CI for pull request 128 started" }] }) },
  { at: 1600, apply: (s, now) => setJob(s, 0, { state: "success", end: now }) },
  { at: 2500, apply: (s, now) => ({ ...setJob(s, 2, { state: "failed", end: now }), events: [...s.events, { id: "unit", text: "Unit tests failed: 1 test failed" }] }) },
  { at: 3500, apply: (s, now) => ({ ...setJob(s, 2, { state: "retrying", start: now, end: undefined }), events: [...s.events, { id: "retry", text: "Retrying unit tests, attempt 2 of 3" }] }) },
  { at: 3900, apply: (s, now) => setJob(setJob(s, 1, { state: "success", end: now }), 3, { state: "running", start: now }) },
  { at: 5500, apply: (s, now) => setJob(s, 2, { state: "success", end: now }) },
  { at: 6400, apply: (s, now) => ({ ...setJob(setJob(s, 3, { state: "canceled", end: now }), 4, { state: "canceled" }), events: [...s.events, { id: "cancel", text: "End-to-end and Build image canceled by Priya Shah. Checks finished: 3 passed, 2 canceled, 1 skipped, in 5.9 seconds" }] }) },
];

function CiJobs({ state }: { state: string }) {
  useHeldState(state);
  const name = state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "");
  const { state: run, play } = useRun(JOBS_START, JOBS_STEPS, name === "passed" ? JOBS_STEPS.length - 1 : 3);
  return (
    <Card style={pad}>
      <div style={head}><h3 style={title}>Checks · pull request #128</h3><span style={timeEnd}><Replay onClick={play} /></span></div>
      <ul aria-label="Checks" style={{ listStyle: "none", margin: 0, padding: 0, font: "400 13px / 18px var(--basalt-font-family-sans)" }}>
        {run.jobs.map((j, i) => (
          <li key={j.name} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", alignItems: "center", gap: 16, padding: "10px 0", borderTop: i ? "1px solid var(--basalt-border-divider)" : 0 }}>
            <span style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", minWidth: 0 }}>{j.name}<span style={{ color: "var(--basalt-text-tertiary)", fontSize: 12 }}>{j.meta}</span></span>
            <StageBadge variant="plain" state={j.state} words={{ retrying: "Retrying, 2 of 3" }} />
            <RunTimer start={j.start} end={j.end} whenHeld="hidden" />
          </li>
        ))}
      </ul>
      <RunAnnouncer label="Checks updates" events={run.events} />
    </Card>
  );
}

// ---- 5. The agent run: RunTimeline and the counter

interface Item { id: string; state?: StageState; word?: string; text: React.ReactNode; meta?: string; start?: number; end?: number; detail?: string; approval?: boolean }
interface AgentRun { run: StageState; start?: number; end?: number; items: Item[]; line: string; events: RunEvent[] }
const AGENT_START: AgentRun = { run: "queued", items: [], line: "Waiting to start", events: [] };
function agentSteps(): Step<AgentRun>[] {
  const steps: Step<AgentRun>[] = [{ at: 400, apply: (s, now) => ({ ...s, run: "running", start: now, events: [{ id: "start", text: "Agent started on INC-0042, Payments API latency" }] }) }];
  let at = 400;
  const tool = (id: string, doing: React.ReactNode, did: React.ReactNode, ms: number, result: string, end: StageState = "success", line = "") => {
    steps.push({ at, apply: (s, now) => ({ ...s, line: line || s.line, items: [...s.items, { id, state: "running", text: doing, start: now }] }) });
    at += ms;
    steps.push({ at, apply: (s, now) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, state: end, text: did, meta: result, end: now } : x)), events: end === "failed" ? [...s.events, { id, text: "Log search failed: timed out after 10 seconds. The run continues." }] : s.events }) });
  };
  tool("read", <>Reading <code>deploy/payments-api.yaml</code></>, <>Read <code>deploy/payments-api.yaml</code></>, 700, "84 lines", "success", "Reading the service config");
  tool("p99", <>Querying <code>p99 latency · payments-api · 2 h</code></>, <>Queried <code>p99 latency · payments-api · 2 h</code></>, 1400, "p99 1.8 s since 14:05", "success", "Querying metrics");
  tool("logs", <>Searching logs for <code>"pool timeout"</code></>, <>Searched logs for <code>"pool timeout"</code></>, 1500, "Timed out after 10 s", "failed", "Searching logs");
  tool("deploys", <>Listing deploys of <code>payments-api</code></>, <>Listed deploys of <code>payments-api</code></>, 800, "4f2a1c0 at 14:02", "success", "Listing recent deploys");
  steps.push({ at, apply: (s) => ({ ...s, items: [...s.items, { id: "finding", word: "Finding", text: "Connection pool exhausted after deploy 4f2a1c0", meta: "High confidence" }] }) });
  at += 700;
  steps.push({ at, apply: (s, now) => ({ ...s, line: "Waiting for approval", items: [...s.items, { id: "approve", state: "queued", word: "Waiting for approval", text: "Roll back payments-api to 4f29e0b", meta: "Medium risk", start: now, detail: "kubectl rollout undo deployment/payments-api -n payments", approval: true }], events: [...s.events, { id: "approval", text: "Approval needed: roll back payments-api to 4f29e0b, medium risk" }] }) });
  at += 2600;
  steps.push({ at, apply: (s, now) => s.items.find((x) => x.id === "approve")?.state !== "queued" ? s : ({ ...s, items: s.items.map((x) => (x.id === "approve" ? { ...x, state: "success", word: "Approved by Priya Shah", end: now, approval: false } : x)), events: [...s.events, { id: "approved", text: "Priya Shah approved the rollback" }] }) });
  tool("rollback", <>Running <code>kubectl rollout undo deployment/payments-api</code></>, <>Ran <code>kubectl rollout undo deployment/payments-api</code></>, 2200, "Rolled back to 4f29e0b", "success", "Rolling back");
  tool("check", <>Querying <code>p99 latency · last 10 min</code></>, <>Queried <code>p99 latency · last 10 min</code></>, 1100, "p99 240 ms", "success", "Checking the result");
  steps.push({ at, apply: (s, now) => ({ ...s, run: "success", end: now, line: "Rolled back; p99 is back to 240 ms.", events: [...s.events, { id: "end", text: `Agent run completed in ${((now - (s.start ?? now)) / 1000).toFixed(1)} seconds: rolled back, p99 back to 240 milliseconds` }] }) });
  return steps;
}
const AGENT_STEPS = agentSteps();
const AGENT_POSES: Record<string, number> = { default: 10, waiting: 10, end: AGENT_STEPS.length - 1, open: AGENT_STEPS.length - 1, hover: AGENT_STEPS.length - 1 };

function AgentRun({ state }: { state: string }) {
  useHeldState(state);
  const name = state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "").replace(/^held-?/, "") || "default";
  const { state: run, play, setState } = useRun(AGENT_START, AGENT_STEPS, AGENT_POSES[name] ?? 10, { played: name === "played-end" });
  const { held } = useLoops();
  const approve = () => new Promise<void>((resolve) => window.setTimeout(() => { setState((s) => ({ ...s, items: s.items.map((x) => (x.id === "approve" ? { ...x, state: "success" as StageState, word: "Approved by you", end: Date.now(), approval: false } : x)) })); resolve(); }, 300));
  return (
    <Card style={pad}>
      <div style={head}>
        <h3 style={title}>INC-0042 · Payments API latency</h3>
        <StageBadge state={run.run} words={{ running: "Investigating", success: "Completed" }} />
        <span style={timeEnd}><RunTimer start={run.start} end={run.end} /></span>
        <Replay onClick={play} />
      </div>
      {/* The app's step line hides under the hold (foundations: a streaming line hides while the status word stays). */}
      <p aria-hidden="true" style={{ margin: "-8px 0 12px", font: "400 12px / 16px var(--basalt-font-family-sans)", color: "var(--basalt-text-tertiary)", visibility: held && run.run === "running" ? "hidden" : undefined }}>{run.line}</p>
      <RunTimeline label="Agent steps" defaultOpen={name === "open"}>
        {run.items.map((x) => (
          <RunStep key={x.id} state={x.state} mark={x.state ? undefined : FlagIcon} word={x.word} meta={x.meta} start={x.start} end={x.end}
            detail={x.detail ? <code>{x.detail}</code> : undefined} action={x.approval ? <Button size="sm" variant="primary" onClick={approve}>Approve</Button> : undefined}>{x.text}</RunStep>
        ))}
      </RunTimeline>
      <RunAnnouncer label="INC-0042 agent updates" events={run.events} />
    </Card>
  );
}

// ---- 6. The seven states

const STATES: StageState[] = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
function States({ state }: { state: string }) {
  useHeldState(state);
  // Rows that wrap, so the three seats of a state never run past a phone's card.
  return (
    <Card style={pad}>
      <ul aria-label="The seven states" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, font: "400 13px / 18px var(--basalt-font-family-sans)" }}>
        {STATES.map((s) => (
          <li key={s} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
            <StageMark state={s} />
            <StageBadge state={s} words={{ retrying: "Retrying, 2 of 3" }} />
            <StageBadge variant="plain" state={s} words={{ retrying: "Retrying, 2 of 3" }} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---- The five departures from the prototype the owner confirmed, each before (the prototype) and after (this build), for his eye (DECISIONS 316).

const BEFORE = {
  tail: { "dark-1440": tailDark1440, "dark-390": tailDark390, "light-1440": tailLight1440, "light-390": tailLight390 },
  log: { dark: logDark, light: logLight },
  queued: { dark: queuedDark, light: queuedLight },
  connector: { dark: connectorDark, light: connectorLight },
  held: { "dark-1440": heldDark1440, "dark-390": heldDark390, "light-1440": heldLight1440, "light-390": heldLight390 },
};
const themeOf = (): "dark" | "light" => (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
const narrow = () => typeof window !== "undefined" && window.innerWidth < 720;

function Pair({ title, text, before, children }: { title: string; text: string; before: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 12, marginBottom: 40 }}>
      <h3 style={{ margin: 0, font: "600 15px / 20px var(--basalt-font-family-sans)" }}>{title}</h3>
      <p style={{ margin: 0, maxWidth: 640, color: "var(--basalt-text-secondary)", font: "400 13px / 18px var(--basalt-font-family-sans)" }}>{text}</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
        <figure style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 12px / 16px var(--basalt-font-family-sans)", color: "var(--basalt-text-secondary)" }}>Before: the prototype you confirmed</figcaption>
          <img src={before} alt={`${title}: the prototype`} style={{ width: "100%", height: "auto", borderRadius: 8 }} />
        </figure>
        <figure style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 12px / 16px var(--basalt-font-family-sans)", color: "var(--basalt-text-secondary)" }}>After: this build</figcaption>
          {children}
        </figure>
      </div>
    </section>
  );
}

const T = Date.now() - 20_000;
const TAIL_STEPS = [
  ["Read", "deploy/payments-api.yaml", "84 lines", "success"], ["Queried", "p99 latency · payments-api · 2 h", "p99 1.8 s since 14:05", "success"], ["Searched logs for", "\"pool timeout\"", "Timed out after 10 s", "failed"],
  ["Listed deploys of", "payments-api", "4f2a1c0 at 14:02", "success"], ["Ran", "kubectl rollout undo deployment/payments-api", "Rolled back to 4f29e0b", "success"], ["Queried", "p99 latency · last 10 min", "p99 240 ms", "success"],
] as const;

function Departures() {
  const [theme, setTheme] = React.useState(themeOf);
  React.useEffect(() => { const o = new MutationObserver(() => setTheme(themeOf())); o.observe(document.documentElement, { attributeFilter: ["data-theme"] }); return () => o.disconnect(); }, []);
  const w = narrow() ? "390" : "1440";
  const t = Date.now();
  return (
    <div>
      <Pair title="1. The timeline's tail goes below 4.5:1, with a way back" text="Your five ink steps are kept. Rows 2 to 5 of the tail are below 4.5:1 on purpose, and the button above the tail opens the whole record in full ink; it says when the tail holds a failure." before={BEFORE.tail[`${theme}-${w}` as "dark-1440"]}>
        <Card style={pad}>
          <RunTimeline label="Agent steps">
            {TAIL_STEPS.map(([verb, arg, result, st], i) => <RunStep key={i} state={st as StageState} meta={result} start={T} end={T + 700 + i * 300}>{verb} <code>{arg}</code></RunStep>)}
          </RunTimeline>
        </Card>
      </Pair>
      <Pair title="2. The deploy log's tail is one step, not five" text="Lines older than the newest three stages step down once, to tertiary ink (4.5:1 or better everywhere). The log has no open form to switch to, so the five-step ladder would leave unreadable lines with no way back." before={BEFORE.log[theme]}>
        <Terminal title="Deploy · basalt-sra" stages keep={3} status="done" time={{ start: t - 6800, end: t }} lines={[
          { kind: "command", text: "basalt deploy --prod" }, { kind: "stage", state: "done", text: "Cloned main@4f2a1c0", start: 0, end: 700 }, { kind: "stage", state: "skipped", text: "cache restore (no cache)" },
          { kind: "stage", state: "done", text: "Installed 412 packages", start: 0, end: 1700 }, { kind: "stage", state: "done", text: "Built 142 routes", start: 0, end: 2300 }, { kind: "output", text: "Compiled 142 routes" },
          { kind: "stage", state: "done", text: "Uploaded 3 artifacts", start: 0, end: 900 }, { kind: "stage", state: "done", text: "Promoted to production", start: 0, end: 500 }, { kind: "done", text: "Ready  https://basalt-sra.example" },
        ]} />
      </Pair>
      <Pair title="3. The queued mark breathes from 65%, in secondary ink" text="The prototype breathed from 45% in tertiary ink, which fell to 1.89:1 in light. From 65% in secondary it is 3:1 or better at every moment on every surface. Above: at rest; below: the bottom of its breath." before={BEFORE.queued[theme]}>
        <Card style={{ ...pad, gap: 12 }}>
          {[1, 0.65].map((o) => <div key={o} style={{ display: "flex", alignItems: "center", gap: 12, font: "400 13px / 18px var(--basalt-font-family-sans)" }}><span style={{ opacity: o, display: "inline-flex" }}><StageMark state="queued" /></span>Queued<span style={{ color: "var(--basalt-text-tertiary)", fontSize: 12 }}>{o === 1 ? "at rest" : "at 65%"}</span></div>)}
        </Card>
      </Pair>
      <Pair title="4. The connector no longer fills or breaks" text="One still line between two marks, drawn beside an open reason too. A vertical line that fills when a stage passes is a status mark on a vertical line, which your own rule bans; the rail's horizontal links keep their fill." before={BEFORE.connector[theme]}>
        <Card style={pad}>
          <StageList label="Deploy 812 stages">
            {(["Clone", "Install", "Build"] as const).map((n, i) => <RunStage key={n} name={n} state="success" meta={["main@4f2a1c0", "412 packages", "142 routes"][i]} start={0} end={[800, 1600, 2100][i]} />)}
            <RunStage name="Test" state="failed" meta="unit and e2e" start={0} end={1400} detail={<><p><strong>3 tests failed</strong> in <code>session.test.ts</code></p><small>Exit 1 · attempt 1 of 2</small></>} action={<Button size="sm" variant="secondary" icon={ArrowClockwiseIcon}>Retry</Button>} />
            <RunStage name="Deploy" state="skipped" word="Blocked by Test" meta="production" />
            <RunStage name="Promote" state="skipped" word="Blocked by Test" meta="basalt-sra.example" />
          </StageList>
        </Card>
      </Pair>
      <Pair title="5. Under Pause animations, a stage's own time hides and the head says when the run started" text="The prototype put the held form in every timer, which is wider than its seat and wrapped on the rail at 390. Now only the run's head says &quot;Started 3:47 PM&quot;; each stage's running time hides, its box kept." before={BEFORE.held[`${theme}-${w}` as "dark-1440"]}>
        <HeldRail />
      </Pair>
    </div>
  );
}

/** The rail mid-run under the hold, for departure 5's "after": the hold is set on this rail's own run only while it shows. */
function HeldRail() {
  const [t0] = React.useState(() => Date.now());
  useHeldState("held");
  return (
    <Card style={pad}>
      <div style={head}><h3 style={title}>Release v2.14.0</h3><StageBadge state="running" words={{ running: "In progress" }} /><span style={timeEnd}><RunTimer start={t0 - 3300} /></span></div>
      <StageRail label="Release v2.14.0 stages">
        <RunStage name="Build" state="success" start={t0 - 3300} end={t0 - 1200} />
        <RunStage name="Checks" state="running" start={t0 - 1200} />
        <RunStage name="Deploy" state="queued" />
        <RunStage name="Promote" state="queued" />
      </StageRail>
    </Card>
  );
}

const COMMON = [
  "Decided by the council for the owner's handoff (DECISIONS 302, 304, 307, 312 and 316); built by Opus from the decision. Not reviewed: no panel or council member has read the build.",
  "Every class begins basalt-run- (Stage and .stage are the art's). Each run has one voice, RunAnnouncer: every event once, in order; never a timer, a roll or a passed stage.",
];

export const ROUND_67: Round = {
  id: "67",
  title: "Stage animations (DECISIONS 316)",
  reviewed: false,
  summary:
    "The owner's confirmed stage animations, built to the council's decision (DECISIONS 316): StageMark (seven states, the queued breath), StageBadge (a face that changes in place), RunTimer, RunAnnouncer, StageList and StageRail with RunStage, Terminal's declared stage transcript, and RunTimeline with the counter. Five departures from the confirmed prototype are for the owner's eye: the tail goes below 4.5:1 with the toggle as the way back; the deploy log steps back once; the queued mark breathes from 65% in secondary ink; the connector no longer fills or breaks; under the hold a stage's own time hides and the head shows when the run started. Not reviewed.",
  steps: [
    {
      id: "departures",
      name: "Five departures, before and after",
      intro: "The five places this build differs from the prototype you confirmed, each because a finding showed the confirmed form could not ship as it was. Before is the prototype; after is this build, live.",
      decisions: [...COMMON, "Each departure is in DECISIONS 316's list for your eye; none changes one of your picks."],
      tryIt: ["Switch the theme: each before picture follows it.", "Hover the timeline's tail, or press its toggle: the whole record opens in full ink."],
      widths: W,
      scales: [2],
      height: 3600,
      demo: () => <Departures />,
    },
    {
      id: "stage-list",
      name: "Stage list: a deploy pipeline",
      intro: "Deploy #812: Test fails, its reason and Retry open under it, Deploy and Promote are blocked, the retry passes. The room for one reason is held from the start, so the card never moves.",
      decisions: [
        ...COMMON,
        "Every word but a passed stage's is drawn; a passed stage is its check and its time. The connector is one still 1px line between marks, beside the open reason too (departure 4).",
        "Retry is a Button whose promise is the app's: busy until the retry starts, and focus goes to Test's name when the reason closes, whoever closed it.",
      ],
      tryIt: ["Press Retry while Test has failed, from the keyboard: focus lands on Test.", "Press \"Pause animations\" during the run: the ring stands still, the queued mark stops breathing, the head says when the run started and each stage's own time hides."],
      states: ["failed", "passed", "held", "failed-reduced-motion@1440", "failed-forced-colours@1440", "failed-more-contrast@1440"],
      widths: W,
      scales: [2],
      height: 620,
      touch: true,
      demo: ({ state }) => <DeployList state={state} />,
    },
    {
      id: "stage-rail",
      name: "Stage rail: a release",
      intro: "Release v2.14.0 on one line: each link fills from the inline start when its stage passes; the running ring is the rail's only moving mark.",
      decisions: [...COMMON, "A node's status seat holds its time, or its word when it failed, was skipped or canceled, or is retrying. Five or six stages are drawn as the list under 480px of the rail's own width."],
      tryIt: ["Watch a link fill as each stage passes; Replay empties them at once."],
      states: ["default", "words", "passed", "held", "default-forced-colours@1440"],
      widths: W,
      scales: [2],
      height: 420,
      touch: true,
      demo: ({ state }) => <ReleaseRail state={state} />,
    },
    {
      id: "deploy-log",
      name: "Deploy log: a stage transcript",
      intro: "A Terminal declared `stages`: never a log, braille in the gutter while a stage runs, a duration column at the end of each line, and the lines older than the newest three stages stepped back once (departure 2).",
      decisions: [...COMMON, "No scrollbar on a live window, on either axis, from its first frame. Skipped and canceled draw their word first; a failed line is the error line."],
      tryIt: ["Scroll the log with the keys (Home, End, the arrows): no bar is drawn, with a mouse plugged in too."],
      states: ["default", "passed", "held", "default-more-contrast@1440"],
      widths: W,
      scales: [2],
      height: 440,
      touch: true,
      demo: ({ state }) => <DeployLog state={state} />,
    },
    {
      id: "ci-jobs",
      name: "Status changes: a CI job list",
      intro: "Pull request #128's checks: each status is a StageBadge whose face changes in place, out and then in, in a seat as wide as its widest face.",
      decisions: [...COMMON, "The seat is measured from the words in a hidden cell: no spinner runs to measure with."],
      tryIt: ["Replay and watch Unit tests fail, retry and pass: nothing beside the badge moves."],
      states: ["default", "passed", "default-reduced-motion@1440"],
      widths: W,
      scales: [2],
      height: 460,
      touch: true,
      demo: ({ state }) => <CiJobs state={state} />,
    },
    {
      id: "agent-run",
      name: "Agent run: the timeline and the counter",
      intro: "INC-0042: the newest three steps in full, the older ones rolled into a receding tail; the approval waits in full, and the toggle above opens the whole record.",
      decisions: [
        ...COMMON,
        "The tail's first row is tertiary (4.5:1 everywhere); rows 2 to 5 go below it on purpose, the named exception, and \"Show 5 earlier steps, 1 failed\" opens the whole record in full ink (departure 1).",
        "The window starts at its end and keeps it; it follows only while the reader is at the end, and holds still while Approve is under the pointer or focused.",
      ],
      tryIt: ["Hover or focus the window: the tail lifts to its first step.", "Wheel up while the run plays: new steps land below and the window stays where you put it."],
      states: ["waiting", "played-end", "end", "open", "held", "end-reduced-motion@1440", "end-forced-colours@1440", "end-more-contrast@1440"],
      widths: W,
      scales: [2],
      height: 640,
      touch: true,
      demo: ({ state }) => <AgentRun state={state} />,
    },
    {
      id: "states",
      name: "The seven states",
      intro: "Each state's mark (16px, the ring for running), its head badge and its plain badge (braille for running).",
      decisions: [...COMMON, "The queued mark breathes from 65% in secondary ink, 3:1 at its lowest on every surface (departure 3). No filled disc anywhere."],
      tryIt: ["Turn on reduced motion: the queued mark is still, the ring fades, braille holds its first frame."],
      states: ["default", "held", "default-forced-colours@1440"],
      widths: W,
      scales: [2],
      height: 420,
      demo: ({ state }) => <States state={state} />,
    },
  ],
};
