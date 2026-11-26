import * as React from "react";

import type { CodeToken } from "./syntax";

/** A run of one line's text, and its syntax colour when it has one. */
export interface CodeRun {
  text: string;
  color?: string;
}

/**
 * Cuts code into lines of runs, for a block whose lines each have a gutter. Tokens keep their colour; the whitespace
 * between them is a run of its own. A CRLF ends a line like an LF, and a final newline does not add an empty last line
 * (a `pre` doesn't show one either). Copy never reads this: it takes the source exactly as given.
 */
export function codeLines(code: string, tokens: CodeToken[] | null): CodeRun[][] {
  const runs: CodeRun[] = [];
  if (tokens) {
    let cursor = 0;
    for (const token of tokens) {
      if (token.offset > cursor) runs.push({ text: code.slice(cursor, token.offset) });
      runs.push({ text: token.content, color: token.color });
      cursor = token.offset + token.content.length;
    }
    if (cursor < code.length) runs.push({ text: code.slice(cursor) });
  } else {
    runs.push({ text: code });
  }
  let current: CodeRun[] = [];
  const lines: CodeRun[][] = [current];
  for (const run of runs) {
    run.text.split("\n").forEach((piece, i) => {
      if (i > 0) lines.push((current = []));
      if (piece) current.push({ text: piece, color: run.color });
    });
  }
  for (const line of lines) {
    const last = line.at(-1);
    if (last?.text.endsWith("\r")) {
      if (last.text === "\r") line.pop();
      else line[line.length - 1] = { ...last, text: last.text.slice(0, -1) };
    }
  }
  if (lines.length > 1 && current.length === 0 && code.endsWith("\n")) lines.pop();
  return lines;
}

const SPACE = /([ \t]+)/;

/**
 * One line's runs as words for a block that wraps (`CodeBlock wrap`): each run of characters between spaces is one `basalt-code-word`, which never
 * breaks inside, and the spaces stand between the words, so a wrapped line breaks at a space and nowhere else (never after a hyphen or a slash).
 * A word longer than the line is not broken: the block scrolls sideways for it, as an unwrapped block does. Colours are kept inside the words.
 *
 * The words are the same whatever the colours, so a server that sent coloured spans and a client that has not loaded the grammar yet draw the
 * same tree down to the words: spaces are joined into one text node across runs, and a word with no colour is one string child. React hydrates a
 * string child by its text alone, so the server's coloured spans inside a word are kept (the same trick the unwrapped lines use).
 */
export function codeWords(line: CodeRun[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let word: React.ReactNode[] = [];
  let coloured = false;
  const flush = () => {
    if (!word.length) return;
    const children = coloured ? word : word.join("");
    out.push(<span key={out.length} className="basalt-code-word">{children}</span>);
    word = [];
    coloured = false;
  };
  for (const run of line) {
    for (const piece of run.text.split(SPACE)) {
      if (!piece) continue;
      if (SPACE.test(piece)) {
        flush();
        const last = out.length - 1;
        if (typeof out[last] === "string") out[last] = out[last] + piece;
        else out.push(piece);
      } else if (run.color) {
        coloured = true;
        word.push(<span key={word.length} style={{ color: run.color }}>{piece}</span>);
      } else if (typeof word[word.length - 1] === "string") {
        word[word.length - 1] = (word[word.length - 1] as string) + piece;
      } else {
        word.push(piece);
      }
    }
  }
  flush();
  return out;
}

/** Whether a line ends in a backslash, so the next line continues it and takes an empty gutter. */
export const continues = (line: CodeRun[] | undefined) => line?.at(-1)?.text.endsWith("\\") ?? false;

export interface CodeLineProps {
  /** What sits in the gutter: a prompt, a status mark, or nothing (an empty seat). */
  gutter?: React.ReactNode;
  /** No gutter seat at all: a numbered block with no prompt has only the numbers' column. */
  bare?: boolean;
  /**
   * The line's number, in a column of its own before the gutter (`CodeBlock lineNumbers`): a real span, `aria-hidden` and never selected, so
   * copy and a screen reader never take it. `null` keeps the column's seat empty.
   */
  number?: number | null;
  kind?: string;
  /** In a stage transcript given `keep`, a line older than the newest stages: it steps back once, to tertiary ink. */
  receded?: boolean;
  children?: React.ReactNode;
}

/**
 * One line of a block with a gutter: 16px plus `space-2` at the start, then the text. The gutter is chrome. It is
 * `user-select: none`, so a selection never takes it, and what is in it that is only a symbol (a prompt) is `aria-hidden`.
 * `CodeBlock` with a prompt and `Terminal` draw their lines with this one.
 */
export function CodeLine({ gutter, bare = false, number, kind, receded, children }: CodeLineProps) {
  return (
    <span className="basalt-code-line" data-kind={kind} data-receded={receded ? "" : undefined}>
      {number !== undefined ? <span className="basalt-code-number" aria-hidden="true">{number}</span> : null}
      {bare ? null : <span className="basalt-code-gutter">{gutter}</span>}
      <span className="basalt-code-text">{children}</span>
    </span>
  );
}

/** A prompt in the gutter: a real span that assistive technology and a selection both skip. */
export function CodePrompt({ children }: { children: React.ReactNode }) {
  return <span className="basalt-code-prompt" aria-hidden="true">{children}</span>;
}
