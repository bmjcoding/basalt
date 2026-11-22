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
 */
export function codeWords(line: CodeRun[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let word: React.ReactNode[] = [];
  const flush = () => {
    if (!word.length) return;
    out.push(<span key={out.length} className="basalt-code-word">{word}</span>);
    word = [];
  };
  for (const run of line) {
    for (const piece of run.text.split(SPACE)) {
      if (!piece) continue;
      if (SPACE.test(piece)) {
        flush();
        out.push(piece);
      } else {
        word.push(run.color ? <span key={word.length} style={{ color: run.color }}>{piece}</span> : piece);
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
  kind?: string;
  children?: React.ReactNode;
}

/**
 * One line of a block with a gutter: 16px plus `space-2` at the start, then the text. The gutter is chrome. It is
 * `user-select: none`, so a selection never takes it, and what is in it that is only a symbol (a prompt) is `aria-hidden`.
 * `CodeBlock` with a prompt and `Terminal` draw their lines with this one.
 */
export function CodeLine({ gutter, kind, children }: CodeLineProps) {
  return (
    <span className="basalt-code-line" data-kind={kind}>
      <span className="basalt-code-gutter">{gutter}</span>
      <span className="basalt-code-text">{children}</span>
    </span>
  );
}

/** A prompt in the gutter: a real span that assistive technology and a selection both skip. */
export function CodePrompt({ children }: { children: React.ReactNode }) {
  return <span className="basalt-code-prompt" aria-hidden="true">{children}</span>;
}
