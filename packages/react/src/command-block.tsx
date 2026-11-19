import * as React from "react";

import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { Icon } from "./icon";
import { formatStamp } from "./time-format";
import { join } from "./utils";

/** The command with a break opportunity after each dot and slash, so a narrow head wraps at a space or one of those and never inside a word. */
function breakable(command: string): React.ReactNode {
  const pieces = command.split(/(?<=[./])/);
  return pieces.length === 1 ? command : pieces.flatMap((piece, i) => (i === 0 ? [piece] : [<wbr key={i} />, piece]));
}

export interface CommandBlockProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The command that was run. */
  command: string;
  /** The word for how it ended ("allowed", "403"). */
  status?: string;
  /** A refused command's word is primary at weight 500 beside `exit N` (DECISIONS 162, V2), with no colour: the word says it. */
  refused?: boolean;
  /** The exit code, said as "exit 1". */
  exit?: number;
  /** When it ran, to the second. */
  at?: Date | number;
  timeZone?: string;
  /** The locale the time is written in (digits and separators; the hour stays 24-hour, a stamp to the second). Default `en-US`. */
  locale?: string | string[];
  /** What it printed: lines (`LogLine`), tables, trees, links and buttons. */
  children?: React.ReactNode;
}

/**
 * A scrollback block (DECISIONS 162, D14a): a head, then the output. The head is sticky and opaque in the page colour; it holds the core
 * chevron, the command at 500 in primary ink, and the status, `exit N` and the time in tertiary. Blocks are told apart by a hairline and
 * the space under each, and the head is 16px on a 24px line. Under 480px of the block's own width the meta is a second row under the command (always reserved, so a status word arriving moves nothing), and the command breaks only at a space, a dot or a slash. Set `--_basalt-block-top` for a bar the head sticks under, and
 * `scroll-padding-bottom` on the scroller for a prompt the app docks; this part owns neither. It is a log of finished work, not a live
 * region: say a new block through a `StatusLine`. Each block is a named `group` (the command), not a landmark: a scrollback of fifty commands is not fifty regions.
 */
export function CommandBlock({ command, status, refused = false, exit, at, timeZone, locale, className, children, ...props }: CommandBlockProps) {
  const id = React.useId();
  const stamp = at !== undefined ? formatStamp(at, { timeZone, locale }) : null;
  return (
    <div {...props} role="group" aria-labelledby={id} className={join("basalt-command-block", className)}>
      <div className="basalt-command-block-head">
        <Icon icon={ChevronRightGlyph} size={16} className="basalt-command-block-chevron" />
        <span id={id} className="basalt-command-block-command">{breakable(command)}</span>
        {/* Always drawn, even empty, so the narrow head's second row is there before a status word arrives. */}
        <span className="basalt-command-block-meta">
          {status ? <span className="basalt-command-block-status" data-refused={refused ? "" : undefined}>{status}</span> : null}
          {exit !== undefined ? <span className="basalt-command-block-exit">exit {exit}</span> : null}
          {stamp ? <time dateTime={stamp.dateTime} className="basalt-command-block-time">{stamp.text}</time> : null}
        </span>
      </div>
      <div className="basalt-command-block-body">{children}</div>
    </div>
  );
}
