// Round 53: busy controls (DECISIONS 255, 257). The owner's direction ("this is for all buttons, don't need unnecessary api calls for people spamming buttons when the response
// is slow"; "if the draft takes a while, it should dim and have a loading animation"; "the text field hyperflashes while rendering"); the looks decided by Opus under the no-council
// path (DECISIONS 226); the implementation has not been reviewed. A press whose handler returns a promise waits for it (Button, IconButton, TextButton), its mark after 300ms
// for at least 400ms; TextButton's own busy sign; and a field being written into (`writing`). Every word is synthetic. States: the press step's three phases are three columns in
// one picture, with `forced-colours` and `reduced-motion`; the field's `empty-writing`, `rewriting` and the default (written), with `rewriting-forced-colours` and
// `rewriting-reduced-motion`.

import * as React from "react";

import { Button, CopyGlyph, Field, IconButton, Input, Text, Textarea, TextButton } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");
const later = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
/** A slow answer: what a press waits for in the live demo. */
const slow = () => later(2400);
const column: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-4)", minWidth: 0 };
const row: React.CSSProperties = { display: "flex", gap: "var(--basalt-space-3)", alignItems: "center", flexWrap: "wrap" };

/** One column of the press step: the four controls, pressed on mount when `press` says how (never answered, or answered at 350ms). */
function Controls({ press, title, note }: { press: "none" | "waiting" | "answered"; title: string; note: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (press === "none") return;
    for (const control of box.current?.querySelectorAll<HTMLButtonElement>("[data-press]") ?? []) control.click();
  }, [press]);
  const answer = () => (press === "waiting" ? new Promise<void>(() => {}) : press === "answered" ? later(350) : slow());
  return (
    <div style={column}>
      <div>
        <Text size="sm" weight="medium">{title}</Text>
        <Text size="sm" tone="secondary">{note}</Text>
      </div>
      <div ref={box} style={column}>
        <div style={row}>
          <Button data-press="" variant="primary" onClick={answer}>Draft with the scribe</Button>
          <IconButton data-press="" icon={CopyGlyph} label="Copy the summary" variant="secondary" onClick={answer} />
        </div>
        <Text size="sm">The summary is three minutes old. <TextButton data-press="" onClick={answer}>Write it again</TextButton></Text>
        <Text size="sm" tone="secondary">Not right? <TextButton data-press="" quiet onClick={answer}>Ask the scribe again</TextButton></Text>
      </div>
    </div>
  );
}

function PressDemo() {
  // The shot waits until the waiting column's mark is up (300ms) and the answered column's has run its 400ms and gone (700ms).
  React.useEffect(() => {
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = later(950);
  }, []);
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "var(--basalt-space-8)" }}>
      <Controls press="none" title="At rest, and pressed under 300ms" note="A quick answer draws nothing: the cursor shows progress and presses are ignored. Press one: it waits 2.4s." />
      <Controls press="waiting" title="Waiting, past 300ms" note="The ring over the kept label; a TextButton's words a step down and its underline dashed and breathing." />
      <Controls press="answered" title="Answered" note="Answered at 350ms: the mark held its 400ms and went. Nothing moved." />
    </div>
  );
}

const DRAFT = "Checkout is timing out for about one in twenty customers since the 14:05 deploy. Payments API latency is up and the error rate is elevated.";
const REWRITE = "Payments API latency rose after the worker change. We rolled it back at 14:22 and the error rate is falling. Next update by 15:00.";

function FieldDemo({ state }: { state: string }) {
  const kind = kindOf(state);
  const writing = kind === "empty-writing" || kind === "rewriting";
  const [text, setText] = React.useState(kind === "empty-writing" ? "" : kind === "rewriting" ? DRAFT : REWRITE);
  const [title, setTitle] = React.useState(kind === "empty-writing" ? "" : kind === "rewriting" ? "Checkout timing out" : "Latency after a worker change");
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = later(500);
  }, []);
  // The live demo: the scribe writes the summary again, clearing it and streaming the new words in, as CIMIP's does.
  const rewrite = async () => {
    setLive(true);
    setText("");
    setTitle("");
    await later(900);
    const words = REWRITE.split(" ");
    for (let i = 1; i <= words.length; i += 1) {
      setText(words.slice(0, i).join(" "));
      await later(70);
    }
    setTitle("Latency after a worker change");
    setLive(false);
  };
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", display: "flex", flexDirection: "column", gap: "var(--basalt-space-4)", maxWidth: "36rem" }}>
      <Field label="Title"><Input writing={writing || live} value={title} placeholder="A short title" onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Summary" description="The scribe writes it from the room; you can edit it once it is written.">
        <Textarea rows={4} writing={writing || live} value={text} placeholder="The scribe writes the summary here." onChange={(e) => setText(e.target.value)} />
      </Field>
      <div><TextButton onClick={rewrite}>Write it again</TextButton></div>
    </div>
  );
}

export const ROUND_53: Round = {
  id: "53",
  title: "Busy controls: a press that waits for its answer, TextButton's busy sign, and a field being written (DECISIONS 255, 257)",
  reviewed: false,
  summary:
    "The owner asked that every button wait for its answer, so a slow server is never asked twice, and that a field being drafted dim and show that it is loading without flashing (DECISIONS 254, 255). Opus decided the looks under the no-council path (DECISIONS 226, 257); Astra reviews the code and the lead checks these pixels. The implementation has not been reviewed. Every word is synthetic.",
  steps: [
    {
      id: "press",
      name: "A press that waits for its answer",
      intro: "Button, IconButton and TextButton, each with an onClick that returns a promise: at rest (which is also how a press answered inside 300ms looks), waiting past 300ms, and answered.",
      decisions: [
        "A press whose onClick returns a promise waits for it: further presses are ignored and the handler is never called twice; the control is aria-busy and aria-disabled, keeps its focus, label and width, and its own disabled is untouched. The cursor is progress from the press.",
        "The mark shows only once the wait has run 300ms and then stays at least 400ms: the shaped skeleton's timings (DECISIONS 247, 248), so one rule covers every wait, a quick answer never flashes and a slow one never blinks.",
        "Button and IconButton: the ring over the kept label, as loading has always drawn it. The press scale and press colour are off from the press, not only once the ring shows.",
        "TextButton has no box and no seat, so nothing in its line moves: the words step down an ink (primary to secondary, quiet secondary to tertiary, both 4.5:1) and the underline turns dashed and breathes on duration-loop-fade, as Sparkline's loading line does. Braille is not used: it is never in a button.",
        "The app's own loading still works and wins (the mark at once). A rejection ends the wait and is raised again, so the app says why. waitForAnswer={false} calls the handler on every press. A Form's promise and a MenuItem's (through its trigger) wait the same way.",
        "The implementation has not been reviewed.",
      ],
      tryIt: ["Press Draft with the scribe five times: one request, the ring after 300ms, the label kept.", "Tab to Write it again and press Enter: focus stays on it while it waits, and nothing beside it moves."],
      states: ["forced-colours", "reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      height: 520,
      demo: () => <PressDemo />,
    },
    {
      id: "field",
      name: "A field being written into",
      intro: "Textarea and Input with writing: an agent's draft into an empty field, a summary written again over the last one, and the written field.",
      decisions: [
        "Read-only and aria-busy at once; after the same 300ms, for at least 400ms, the words dim to secondary ink, the boundary turns dashed (the shape of a wait, as TextButton's underline; an inset outline, so nothing moves) and the fill is a skeleton's, surface-placeholder with the skeleton's calm 2s pulse. Empty, the pulse alone (the placeholder hides).",
        "Not the disabled look, even with its pulse still (reduced motion): the boundary is dashed, the ink is not text-disabled, and the radius, size and focus stay, so nothing moves when it starts or ends (0px).",
        "Text replaces text: each update is painted as it comes in the same ink with no fade (a fade per update is a flash), and an empty value while writing keeps the text shown, so the field never blanks between drafts. The field never remounts.",
        "Reduced motion and the hold still the fill at surface-placeholder, as a skeleton does; forced colours dash the boundary in ButtonText, never GrayText.",
        "On the control, not on Field: Field also holds controls nothing writes into. The HTML skill's .btn keeps its aria-busy; the wait, TextButton's sign and the written field are React's alone.",
        "The implementation has not been reviewed.",
      ],
      tryIt: ["Press Write it again: the old summary stays dimmed until the new words stream in, and the field never blanks or flashes."],
      states: ["empty-writing", "rewriting", "rewriting-forced-colours", "rewriting-reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      height: 520,
      demo: ({ state }) => <FieldDemo key={state} state={state} />,
    },
  ],
};
