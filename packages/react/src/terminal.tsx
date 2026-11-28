import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { CopyGlyph } from "./glyphs/copy";
import { useCopyResult } from "./copy-result";
import { MinusGlyph } from "./glyphs/minus";
import { Button, IconButton } from "./button";
import { CodeLine, CodePrompt } from "./code-lines";
import { loadFlight } from "./control-icon";
import { Icon } from "./icon";
import { LogFields } from "./log-fields";
import type { LogFieldsInput } from "./log-fields";
import { usePanelLevel } from "./layers";
import { watchScrollFade } from "./scroll-fade";
import { Reserve } from "./reserve";
import type { Moment } from "./run-format";
import { RunTimer } from "./run-timer";
import { warnRun } from "./run-warn";
import { Spinner } from "./spinner";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

/** What a line is: a command, what came back, a result (done, a warning, an error), or a stage of a run (DECISIONS 316). */
export type TerminalLineKind = "command" | "output" | "done" | "warning" | "error" | "stage";

/** A stage line's state. A stage that has not started has no line; a retry is a new running line whose text the app writes. */
export type TerminalStageState = "running" | "done" | "failed" | "skipped" | "canceled" | "warning";

export interface TerminalLine {
  kind: TerminalLineKind;
  /** The line as plain text: what copy takes and what a line without `fields` or `node` draws. */
  text: string;
  /**
   * The line as runs of text (DECISIONS 162, V1): `{ text, loud: true }` fields are primary ink at weight 400 and the rest is secondary, with a
   * word-break opportunity after each comma. A refused field stays primary and its own word says it: no colour.
   */
  fields?: LogFieldsInput;
  /** Anything else a line of output holds (a link, a button, a small table). `text` is still its plain form. */
  node?: React.ReactNode;
  /** A stage line's state (`kind: "stage"`). The app writes `text` without the state's word: a skipped stage's "cache restore (no cache)". */
  state?: TerminalStageState;
  /** A stage line's word, drawn before its text, when the app's differs ("Skipped", "Canceled", "Warning" by default; running, done and failed draw none). */
  word?: string;
  /** When a stage line's stage started and ended: its duration, at the line's end. */
  start?: Moment;
  end?: Moment;
}

/** Where a transcript whose lines arrive over time has got to. */
export type TerminalStatus = "idle" | "running" | "paused" | "done" | "failed";

export interface TerminalProps {
  /** Names the transcript, in the head and to assistive technology. */
  title: string;
  lines: TerminalLine[];
  /** The prompt in a command's gutter. */
  prompt?: string;
  /** Show the copy button, which copies the commands only. On by default. */
  copyable?: boolean;
  /**
   * A transcript whose lines the app appends: `running` while they arrive (and only then is it a `role="log"`), then `paused`,
   * `done` or `failed`. Leave it out for a static record. With `onPause` and `onResume` it shows the pause control.
   */
  status?: TerminalStatus;
  onPause?: () => void;
  onResume?: () => void;
  /** Plays `lines` back itself, one at a time, with Play, Pause, Resume and Replay. */
  replay?: boolean;
  /** Milliseconds between a replay's lines. */
  interval?: number;
  /** An exit code, said beside a failed result: "Failed, exit 1". */
  exitCode?: number;
  /**
   * A stage transcript (DECISIONS 316): declared when it mounts and fixed for its life. Its window is never a `log`: a named region (a group while
   * empty) from its first frame, whatever its `status` and its lines, because the run's `RunAnnouncer` speaks. Stage lines, `keep` and `time` need it.
   */
  stages?: boolean;
  /** In a stage transcript, lines older than the newest `keep` stage lines (with their output) step back once, to tertiary ink. Off unless given. */
  keep?: number;
  /** In a stage transcript, the run's time in the head, after the state word: `start`, `end`, `carried` across a retry and `since` (see `RunTimer`). */
  time?: { start?: Moment; end?: Moment; carried?: number; since?: Moment };
  className?: string;
}

const MARKS = {
  done: { icon: CheckCircleIcon, name: "Done" },
  warning: { icon: WarningIcon, name: "Warning" },
  error: { icon: XCircleIcon, name: "Error" },
} as const;

// A stage line's gutter: braille while running, the core check when done, the error's XCircle when failed, the core minus when skipped, Prohibit when
// canceled, the Warning triangle in status-warning when it ended with a warning. Running, done and failed are said by the mark (a named image); skipped,
// canceled and warning by the word drawn before the text.
const STAGE_MARKS = {
  done: { icon: CheckGlyph, name: "Done" },
  failed: { icon: XCircleIcon, name: "Failed" },
  skipped: { icon: MinusGlyph, name: undefined },
  canceled: { icon: ProhibitIcon, name: undefined },
  warning: { icon: WarningIcon, name: undefined },
} as const;
const STAGE_WORDS_DRAWN: Partial<Record<TerminalStageState, string>> = { skipped: "Skipped", canceled: "Canceled", warning: "Warning" };

const REPLAY_WORDS = ["Play", "Pause", "Resume", "Replay"] as const;
const STREAM_WORDS = ["Pause", "Resume"] as const;

/** Words that change in place, in the head's and the buttons' one cell (see `Reserve`). */
const swap = (show: string, alternatives: Record<string, React.ReactNode>) => <Reserve className="basalt-terminal-swap" show={show} alternatives={alternatives} />;

/**
 * A transcript of a terminal session, a sibling of `CodeBlock` on the same frame (well, level, radius 8, title row and copy
 * button). Commands are primary ink behind a prompt in the gutter; output is secondary; a result carries the callout's mark in the
 * gutter (only an error's text takes danger ink). No syntax colour. Static by default: a `figure` with a named `pre`, no live
 * region. A transcript whose lines arrive is a fixed-height `role="log"` that follows the end only while the reader is there, and
 * is a log only while lines arrive.
 */
export function Terminal({ title, lines, prompt = "$", copyable = true, status, onPause, onResume, replay = false, interval = 600, exitCode, stages: stagesProp, keep, time, className }: TerminalProps) {
  const level = usePanelLevel();
  // A stage transcript is declared when it mounts and stays one: the mode is never read from the lines. A stage line in a transcript that did not
  // declare it is still drawn, and makes the window silent from then on (the net, never the plan).
  const [stages] = React.useState(() => stagesProp === true);
  const stray = React.useRef(false);
  if (!stages && !stray.current && lines.some((line) => line.kind === "stage")) {
    stray.current = true;
    if (process.env.NODE_ENV !== "production") warnRun("Terminal", "a stage line arrived in a transcript that did not declare `stages`; declare it when the transcript mounts.");
  }
  if (process.env.NODE_ENV !== "production" && !stages && (keep !== undefined || time !== undefined)) warnRun("Terminal", "`keep` and `time` belong to a stage transcript; declare `stages`. They do nothing here.");
  const silent = stages || stray.current;

  // ---- a replay plays the lines itself
  const [shown, setShown] = React.useState(0);
  const [mode, setMode] = React.useState<"idle" | "running" | "paused" | "finished">("idle");
  React.useEffect(() => {
    if (!replay || mode !== "running") return;
    if (shown >= lines.length) { setMode("finished"); return; }
    // Line 1 arrives one frame after the log region does, so it lands in a live region that is already in the accessibility tree and
    // is announced; visually that is one frame, not an interval.
    if (shown === 0) {
      const frame = requestAnimationFrame(() => setShown(1));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setShown((n) => n + 1), interval);
    return () => clearTimeout(timer);
  }, [replay, mode, shown, lines.length, interval]);

  // A replay ends failed on an error, and on a stage line that failed (a stage transcript's own failure).
  const last = lines[lines.length - 1];
  const failed = last?.kind === "error" || (last?.kind === "stage" && last.state === "failed");
  const state: TerminalStatus | undefined = replay ? (mode === "finished" ? (failed ? "failed" : "done") : mode) : status;
  const live = state !== undefined;
  const visible = replay ? lines.slice(0, shown) : lines;

  // ---- follow the end only while the reader is at it
  const pre = React.useRef<HTMLPreElement>(null);
  const atEnd = React.useRef(true);
  const onScroll = () => {
    const el = pre.current;
    if (el) atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
  };
  React.useLayoutEffect(() => {
    const el = pre.current;
    if (live && el && atEnd.current) el.scrollTop = el.scrollHeight;
  }, [live, visible.length]);
  // Each side that hides lines fades (cimip-gaps-3 t7: inline on a static transcript, both axes on a live one, whose window scrolls). Following the end, the
  // bottom band is 0: a line arriving is never faded before the follow reaches it. The ring is the figure's.
  const following = React.useRef(false);
  following.current = live;
  React.useLayoutEffect(() => {
    const el = pre.current;
    if (!el) return undefined;
    const fade = watchScrollFade(el, { axis: live ? "both" : "inline", skip: { get end() { return following.current && atEnd.current; } } });
    return () => fade.stop();
  }, [live]);

  // ---- copy: the commands, one per line. A replay knows every line, so it copies them all wherever its playhead is; a stream the
  // app drives passes the lines that have arrived. With no command there is nothing to copy, and the button is off.
  const commands = lines.filter((line) => line.kind === "command").map((line) => line.text).join("\n");
  // What the last copy did, held for CONFIRM_MS: the words stay and the glyph says it, the check or the close (copy-result.ts; DECISIONS 336).
  const copyResult = useCopyResult();
  // The compact copy glyph is one that changes (Copy, then Check): the morph's engine is on its way before the first click.
  React.useEffect(() => {
    if (copyable) loadFlight();
  }, [copyable]);
  const copy = () => (commands ? copyResult.copy(commands) : undefined);

  // ---- the replay's control
  const press = () => {
    if (mode === "running") setMode("paused");
    else if (mode === "paused") setMode("running");
    // The log is a log first; the first line follows on the next frame (see the effect above), so the box is never blank for an interval.
    else { atEnd.current = true; setShown(0); setMode("running"); }
  };
  const control = replay ? { show: mode === "idle" ? "Play" : mode === "running" ? "Pause" : mode === "paused" ? "Resume" : "Replay", words: REPLAY_WORDS, onClick: press, disabled: false }
    : onPause || onResume ? { show: state === "paused" ? "Resume" : "Pause", words: STREAM_WORDS, onClick: state === "paused" ? onResume : onPause, disabled: state !== "running" && state !== "paused" }
    : null;

  const failedWord = exitCode === undefined ? "Failed" : `Failed, exit ${exitCode}`;
  // Every state's words stand in one cell (see `Reserve`), so the head is as wide as its widest and never moves.
  // Which lines step back (one step, tertiary ink): a stage line older than the newest `keep`, and the output under it. A command never does, and
  // nothing before the first stage line does (ruling 7).
  let boundary = -1;
  let firstStage = -1;
  if (stages && keep !== undefined && keep >= 1) {
    const at = visible.map((line, i) => (line.kind === "stage" ? i : -1)).filter((i) => i >= 0);
    firstStage = at[0] ?? -1;
    if (at.length > keep) boundary = at[at.length - keep]!;
  }
  const recedes = (i: number) => i < boundary && i >= firstStage && visible[i]!.kind !== "command";
  const words = state === undefined ? null : (
    swap(state, {
      idle: "Not started",
      running: <><Spinner variant="braille" /><span>Running</span></>,
      paused: "Paused",
      done: <><Icon icon={CheckCircleIcon} size={16} className="basalt-terminal-done" /><span>Done</span></>,
      failed: <><Icon icon={XCircleIcon} size={16} className="basalt-terminal-failed" /><span data-error="">{failedWord}</span></>,
    })
  );

  // The figure is named by its title alone: its caption also holds the state and the buttons, which are not its name.
  const captionId = React.useId();
  return (
    <figure aria-labelledby={captionId} className={join("basalt-code basalt-terminal", className)} data-titled="" data-level={level} data-live={live ? "" : undefined}>
      <figcaption className="basalt-code-title basalt-terminal-head">
        <span id={captionId} className="basalt-terminal-title">{title}</span>
        <span className="basalt-terminal-actions">
          {words ? <span className="basalt-terminal-state" data-state={state}>{words}</span> : null}
          {stages && time ? <span className="basalt-terminal-time"><RunTimer start={time.start} end={time.end} carried={time.carried} since={time.since} /></span> : null}
          {control ? (
            <Button variant="ghost" size="sm" edge={copyable ? undefined : "end"} onClick={control.onClick} disabled={control.disabled}>
              {swap(control.show, Object.fromEntries(control.words.map((word) => [word, word])))}
            </Button>
          ) : null}
          {copyable ? (
            <>
              {/* Wide: the words. Narrow (the terminal's own width, under 30rem): the icon alone, with the same name. */}
              <Button className="basalt-terminal-copy" variant="ghost" size="sm" edge="end" icon={CopyGlyph} done={copyResult.done} doneIcon={copyResult.doneIcon} onClick={copy} disabled={!commands}>
                Copy commands
              </Button>
              <IconButton className="basalt-terminal-copy-compact" size="sm" edge="end" icon={CopyGlyph} done={copyResult.done} doneIcon={copyResult.doneIcon} label="Copy commands" onClick={copy} disabled={!commands} />
              <span className="basalt-visually-hidden" role="status">{copyResult.status}</span>
            </>
          ) : null}
        </span>
      </figcaption>
      {/* A scrollable region is reachable by keyboard. It is a log only while lines arrive: never idle, paused or finished. Before the
          first line it is a named group, because a named element with no role and no text is not valid ARIA. */}
      <pre ref={pre} onScroll={onScroll} className="basalt-code-pre" tabIndex={0} role={state === "running" && !silent ? "log" : visible.length === 0 ? "group" : "region"} aria-label={`${title}, transcript`} data-stages={stages ? "" : undefined}>
        <code className="basalt-code-lines">
          {replay && mode === "idle" && visible.length === 0 ? <span className="basalt-terminal-hint">Press Play to start</span> : null}
          {visible.map((line, i) => {
            if (line.kind === "stage") return <StageLine key={i} line={line} receded={recedes(i)} />;
            const mark = line.kind === "done" || line.kind === "warning" || line.kind === "error" ? MARKS[line.kind] : null;
            return (
              <CodeLine
                key={i}
                kind={line.kind}
                receded={recedes(i)}
                gutter={line.kind === "command" ? <CodePrompt>{prompt}</CodePrompt> : mark ? <Icon icon={mark.icon} size={16} label={mark.name} className="basalt-terminal-mark" /> : null}
              >
                {line.node ?? (line.fields ? <LogFields fields={line.fields} /> : line.text)}
              </CodeLine>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}

/** A stage of a run, on one line of a stage transcript: its mark in the gutter, its word and text, and its duration at the line's end. */
function StageLine({ line, receded }: { line: TerminalLine; receded: boolean }) {
  const state = line.state ?? "running";
  const word = line.word ?? STAGE_WORDS_DRAWN[state];
  // A state is said once: where a word is drawn the mark is hidden from assistive technology; where none is, the mark is a named image.
  const named = word ? undefined : state === "running" ? "Running" : STAGE_MARKS[state as Exclude<TerminalStageState, "running">].name;
  const mark = state === "running"
    ? <span role={named ? "img" : undefined} aria-label={named} aria-hidden={named ? undefined : true} className="basalt-terminal-braille"><Spinner variant="braille" /></span>
    : <Icon icon={STAGE_MARKS[state].icon} size={16} label={named} className="basalt-terminal-mark" />;
  const running = line.start !== undefined && line.end === undefined;
  return (
    <span className="basalt-code-line" data-kind="stage" data-state={state} data-receded={receded ? "" : undefined}>
      <span className="basalt-code-gutter">{mark}</span>
      <span className="basalt-code-text basalt-terminal-stage">
        <span>{word ? <span className="basalt-terminal-word">{word} </span> : null}{line.node ?? (line.fields ? <LogFields fields={line.fields} /> : line.text)}</span>
        {/* A running time is a streaming count, so it is not read: the line's text changes once a stage, when its time is final. */}
        {line.start !== undefined ? <span className="basalt-terminal-duration" aria-hidden={running || undefined}><RunTimer start={line.start} end={line.end} whenHeld="hidden" /></span> : null}
      </span>
    </span>
  );
}
