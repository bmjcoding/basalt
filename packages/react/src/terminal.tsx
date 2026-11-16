import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { CopyGlyph } from "./glyphs/copy";
import { Button, IconButton } from "./button";
import { CodeLine, CodePrompt } from "./code-lines";
import { Icon } from "./icon";
import { usePanelLevel } from "./layers";
import { Reserve } from "./reserve";
import { Spinner } from "./spinner";
import { join } from "./utils";

/** What a line is: a command, what came back, or a result (done, a warning, an error). */
export type TerminalLineKind = "command" | "output" | "done" | "warning" | "error";

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
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
  className?: string;
}

const MARKS = {
  done: { icon: CheckCircleIcon, name: "Done" },
  warning: { icon: WarningIcon, name: "Warning" },
  error: { icon: XCircleIcon, name: "Error" },
} as const;

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
export function Terminal({ title, lines, prompt = "$", copyable = true, status, onPause, onResume, replay = false, interval = 600, exitCode, className }: TerminalProps) {
  const level = usePanelLevel();

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

  const failed = lines[lines.length - 1]?.kind === "error";
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

  // ---- copy: the commands, one per line. A replay knows every line, so it copies them all wherever its playhead is; a stream the
  // app drives passes the lines that have arrived. With no command there is nothing to copy, and the button is off.
  const commands = lines.filter((line) => line.kind === "command").map((line) => line.text).join("\n");
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    if (!commands) return;
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
    } catch {
      // clipboard refused (insecure context or permissions): leave the button as it was
    }
  };

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
  const words = state === undefined ? null : (
    swap(state, {
      idle: "Not started",
      running: <><Spinner variant="braille" /><span>Running</span></>,
      paused: "Paused",
      done: <><Icon icon={CheckCircleIcon} size={16} className="basalt-terminal-done" /><span>Done</span></>,
      failed: <><Icon icon={XCircleIcon} size={16} className="basalt-terminal-failed" /><span data-error="">{failedWord}</span></>,
    })
  );

  return (
    <figure className={join("basalt-code basalt-terminal", className)} data-titled="" data-level={level} data-live={live ? "" : undefined}>
      <figcaption className="basalt-code-title basalt-terminal-head">
        <span className="basalt-terminal-title">{title}</span>
        <span className="basalt-terminal-actions">
          {words ? <span className="basalt-terminal-state" data-state={state}>{words}</span> : null}
          {control ? (
            <Button variant="ghost" size="sm" onClick={control.onClick} disabled={control.disabled}>
              {swap(control.show, Object.fromEntries(control.words.map((word) => [word, word])))}
            </Button>
          ) : null}
          {copyable ? (
            <>
              {/* Wide: the words. Narrow (the terminal's own width, under 30rem): the icon alone, with the same name. */}
              <Button className="basalt-terminal-copy" variant="ghost" size="sm" icon={CopyGlyph} onClick={copy} disabled={!commands}>
                {swap(copied ? "Copied" : "Copy commands", { "Copy commands": "Copy commands", Copied: "Copied" })}
              </Button>
              <IconButton className="basalt-terminal-copy-compact" size="sm" icon={copied ? CheckGlyph : CopyGlyph} label={copied ? "Copied" : "Copy commands"} onClick={copy} disabled={!commands} />
              <span className="basalt-visually-hidden" role="status">{copied ? "Copied" : ""}</span>
            </>
          ) : null}
        </span>
      </figcaption>
      {/* A scrollable region is reachable by keyboard. It is a log only while lines arrive: never idle, paused or finished. Before the
          first line it is a named group, because a named element with no role and no text is not valid ARIA. */}
      <pre ref={pre} onScroll={onScroll} className="basalt-code-pre" tabIndex={0} role={state === "running" ? "log" : visible.length === 0 ? "group" : "region"} aria-label={`${title}, transcript`}>
        <code className="basalt-code-lines">
          {replay && mode === "idle" && visible.length === 0 ? <span className="basalt-terminal-hint">Press Play to start</span> : null}
          {visible.map((line, i) => {
            const mark = line.kind === "done" || line.kind === "warning" || line.kind === "error" ? MARKS[line.kind] : null;
            return (
              <CodeLine
                key={i}
                kind={line.kind}
                gutter={line.kind === "command" ? <CodePrompt>{prompt}</CodePrompt> : mark ? <Icon icon={mark.icon} size={16} label={mark.name} className="basalt-terminal-mark" /> : null}
              >
                {line.text}
              </CodeLine>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
