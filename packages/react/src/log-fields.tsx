import * as React from "react";

import { join } from "./utils";

// ---- A log line's fields (DECISIONS 162, V1 and V2) ----
// The words that say what happened are primary ink at weight 400 and the rest is secondary at weight 400. Nothing steps back with age, and
// nothing takes a colour: a refused field stays primary and its own word ("denied") says it. This is the one look for a log line in a
// Terminal, a command block and the fixed slots.

/** One field of a log line: `loud` ones are the words that say what happened. */
export interface LogField {
  text: string;
  loud?: boolean;
}

/** A line as runs of text: a bare string is plain, an object may be `loud`. */
export type LogFieldsInput = readonly (string | LogField)[];

/** Text with a word-break opportunity after each comma, so a long field moves to the next line whole. */
function breaks(text: string): React.ReactNode {
  const pieces = text.split(/(?<=,)/);
  return pieces.length === 1 ? text : pieces.flatMap((piece, i) => (i === 0 ? [piece] : [<wbr key={i} />, piece]));
}

/** The runs of a line: loud fields in primary ink, the rest in the line's own (secondary) ink. */
export function LogFields({ fields }: { fields: LogFieldsInput }) {
  return (
    <>
      {fields.map((field, i) => {
        const { text, loud } = typeof field === "string" ? { text: field, loud: false } : field;
        return loud ? <b key={i} className="basalt-log-field">{breaks(text)}</b> : <React.Fragment key={i}>{breaks(text)}</React.Fragment>;
      })}
    </>
  );
}

export interface LogLineProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The line as runs of text. Or pass children. */
  fields?: LogFieldsInput;
  children?: React.ReactNode;
}

/** One log line on its own: mono 13px on a 20px line in secondary ink, its loud fields primary. */
export function LogLine({ fields, children, className, ...props }: LogLineProps) {
  return <div {...props} className={join("basalt-log-line", className)}>{fields ? <LogFields fields={fields} /> : children}</div>;
}
