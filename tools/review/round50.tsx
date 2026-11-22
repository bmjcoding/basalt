// Round 50: Basalt's controls draw their core glyphs through the morph. Engineering that restores DECISIONS 38 ("Morphs that ship", 3 to 0) and 55 (the owner approved the set):
// `Button` and `IconButton` (`icon`, a pressed toggle, `done`), `NavItem` and `TabBarItem` (becoming current), `CodeBlock`'s copy and `Terminal`'s compact copy. Nothing is redrawn
// and no frame changes: the controls ran the glyph's own swap, and now run the engine `MorphIcon` runs. The design panel has not reviewed this implementation.
//
// The frozen frames are the real controls on a virtual clock: the page's `performance.now` and `requestAnimationFrame` are replaced by a clock this file steps (8ms a tick, the last one short so a frame lands on the millisecond) while the
// change runs, so a state "frame-60" is the control exactly 60ms into its 200ms, and the real clock is put back afterwards. Reduced motion is the page under that emulation: a toggle, a current item and a copy
// button's check swap at once, as MorphIcon does (DECISIONS 221); the IconButton done seat keeps its own 100ms crossfade, as it did. Every word is synthetic.

import * as React from "react";
import { flushSync } from "react-dom";

import {
  Button,
  CheckGlyph,
  CodeBlock,
  CopyGlyph,
  HomeGlyph,
  IconButton,
  Nav,
  NavItem,
  PauseGlyph,
  SandboxesGlyph,
  SearchGlyph,
  SettingsGlyph,
  TabBarItem,
  Terminal,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" };

const idle = async () => {
  for (let i = 0; i < 4; i += 1) await new Promise<void>((resolve) => { const c = new MessageChannel(); c.port1.onmessage = () => resolve(); c.port2.postMessage(0); });
};

/** Run `change`, then step a virtual clock `ms` forward (8ms a tick, the last one short so a frame lands on the millisecond) with the page's own clock replaced while it runs. */
async function frozen(ms: number, change: () => void) {
  const realRaf = window.requestAnimationFrame;
  const realCaf = window.cancelAnimationFrame;
  let t = performance.now();
  let id = 0;
  let queue = new Map<number, FrameRequestCallback>();
  (performance as { now: () => number }).now = () => t;
  window.requestAnimationFrame = (fn) => { id += 1; queue.set(id, fn); return id; };
  window.cancelAnimationFrame = (n) => { queue.delete(n); };
  try {
    change();
    await idle();
    // 8ms a tick, the last one short, so a frame lands on exactly `ms` (60 and 100 are not multiples of 8)
    for (let at = 0; at < ms;) {
      const step = Math.min(8, ms - at);
      at += step;
      t += step;
      const due = queue;
      queue = new Map();
      due.forEach((fn) => fn(t));
    }
  } finally {
    delete (performance as { now?: () => number }).now;
    window.requestAnimationFrame = realRaf;
    window.cancelAnimationFrame = realCaf;
  }
}

const LINES = [
  { kind: "command" as const, text: "basalt sandbox create --image node:22-slim" },
  { kind: "output" as const, text: "Creating sandbox sb_7f3a91c2e0" },
  { kind: "done" as const, text: "Sandbox ready in 3.4 s" },
];

/** Every control, at one of its states: `rest`, `frame-<ms>` (that long into the change), `settled`; a suffix `-forced-colours` or `-reduced-motion` is the page under that emulation. */
function Board({ state }: { state: string }) {
  const [on, setOn] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const kind = state.replace(/-(reduced-motion|forced-colours)$/, "");
  React.useEffect(() => {
    // the review page's own clipboard, so a copy button's "Copied" is the same in every shot
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.resolve() } });
    if (kind === "default" || kind === "rest") return;
    const change = () => {
      flushSync(() => setOn(true));
      root.current?.querySelectorAll<HTMLButtonElement>(".basalt-code-copy button, .basalt-terminal-copy-compact").forEach((button) => button.click());
    };
    const timer = window.setTimeout(() => {
      // the engine is on its way from the first paint (each control loads it at mount); it has had time to arrive
      const frame = /^frame-(\d+)$/.exec(kind);
      if (frame) void frozen(Number(frame[1]), change);
      else change();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kind]);

  return (
    <div ref={root} style={col}>
      {kind === "default" ? (
        <div style={row}>
          <Button onClick={() => setOn((v) => !v)}>{on ? "Change back" : "Change every control"}</Button>
          <Text size="sm" tone="secondary">The two copy buttons change when you press them.</Text>
        </div>
      ) : null}

      <section style={col} aria-label="IconButton, copy to check">
        <Text size="sm" tone="secondary">IconButton with <code>done</code>: Copy to Check, in one seat; the name stays “Copy address”.</Text>
        <div style={row}>
          <IconButton icon={CopyGlyph} done={on} label="Copy address" variant="secondary" />
          <IconButton icon={CopyGlyph} done={on} label="Copy address, small" variant="ghost" size="sm" />
          <Text size="sm" tone="tertiary">{on ? "Copied" : ""}</Text>
        </div>
      </section>

      <section style={col} aria-label="Pressed toggles">
        <Text size="sm" tone="secondary">Pressed toggles: a core glyph with an opening morphs to its selected form. Pause is an action glyph and keeps its drawing, so its pressed state is the plate and the ink step.</Text>
        <div style={row}>
          <IconButton icon={HomeGlyph} pressed={on} label="Home" variant="secondary" />
          <IconButton icon={SearchGlyph} pressed={on} label="Search" variant="ghost" />
          <Button icon={SettingsGlyph} pressed={on} variant="secondary">Settings</Button>
          <IconButton icon={PauseGlyph} pressed={on} label="Pause animations" variant="ghost" />
        </div>
      </section>

      <section style={col} aria-label="CodeBlock and Terminal">
        <Text size="sm" tone="secondary">CodeBlock’s copy and Terminal’s icon-only copy: Copy to Check. Each keeps its name (“Copy code”, “Copy commands”); a polite line says “Copied”.</Text>
        <CodeBlock code={"basalt deploy --env staging"} language="bash" title="terminal" />
        <div style={{ width: 320, maxWidth: "100%" }}><Terminal title="Deploy and test" lines={LINES} /></div>
      </section>

      <section style={col} aria-label="Navigation">
        <Text size="sm" tone="secondary">NavItem and TabBarItem becoming current: the old glyph opens, the new one closes and fills; the 600 label and every width stay.</Text>
        <div style={{ ...row, alignItems: "flex-start", gap: 32 }}>
          <div style={{ width: 260 }}>
            <Nav aria-label="Primary">
              <NavItem href="#home" icon={HomeGlyph} current={!on}>Home</NavItem>
              <NavItem href="#sandboxes" icon={SandboxesGlyph} current={on}>Sandboxes</NavItem>
              <NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem>
            </Nav>
          </div>
          <ul className="basalt-tabbar-list" style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "84px", width: 252, padding: 0, margin: 0, listStyle: "none" }}>
            <TabBarItem href="#home" icon={HomeGlyph} current={!on}>Home</TabBarItem>
            <TabBarItem href="#search" icon={SearchGlyph} current={on}>Search</TabBarItem>
            <TabBarItem href="#settings" icon={SettingsGlyph}>Settings</TabBarItem>
          </ul>
        </div>
      </section>
    </div>
  );
}

const STATES = ["rest", "frame-0", "frame-60", "frame-100", "frame-200", "settled", "frame-60-forced-colours", "settled-forced-colours", "settled-reduced-motion"];
const SHOT = { widths: [1440, 390], scales: [1, 2], height: 1100 };

export const ROUND_50: Round = {
  id: "50",
  title: "Basalt's controls draw their core glyphs through the morph (engineering restoring DECISIONS 38 and 55)",
  reviewed: false,
  summary:
    "No design decision is made here and nothing is redrawn: the owner approved the morphs (DECISIONS 38, 55) and the controls never adopted them. A change of glyph or of selected, in Button, IconButton (a pressed toggle, `done`), NavItem, TabBarItem, CodeBlock's copy and Terminal's compact copy, now runs the one engine MorphIcon runs: the allow-list decides, an allowed change morphs at slow on ease-out, every other change swaps at once, and a long-tail glyph swaps. At rest the markup is Icon's, byte for byte. The engine loads on demand. This also fixes the two copy buttons renaming themselves “Copied”: they keep their name and the polite line says it. The design panel has not reviewed this implementation. Under reduced motion a change in a control swaps at once, as MorphIcon does (DECISIONS 221); the `done` seat keeps its own 100ms crossfade.",
  steps: [
    {
      id: "controls",
      name: "Every control, at rest, mid-morph and settled",
      intro: "Frames at 0, 60, 100 and 200ms of a change that runs 200ms, taken from the real controls on a virtual clock; then the settled state, in forced colours, and under reduced motion.",
      decisions: [
        "DECISIONS 38: the morphs that ship are rest and selected, a rotation group, and the drawn pairs menu and close, play and pause, copy and check, chevron-down and download, both ways; every other change swaps at once. DECISIONS 55: the owner approved the set.",
        "Draw nothing new: the pressed pause shows no morph, because an action glyph keeps its drawing when selected (its pressed state is the plate and the ink step, as approved).",
        "A change that arrives before the engine has loaded swaps, as it did before; the controls whose glyph can change load it at mount, so the first change morphs.",
        "Reduced motion: a pressed toggle, a current item and a changed icon that is an allowed pair swap at once (today's MorphIcon behaviour, DECISIONS 221). The IconButton `done` seat keeps its own 100ms crossfade under reduced motion, for any pair.",
      ],
      tryIt: ["Press “Change every control”: each glyph morphs where the council allowed it.", "Press the two copy buttons: Copy morphs into Check and back, and the name does not change."],
      states: STATES,
      ...SHOT,
      demo: ({ state }) => <Board state={state} />,
    },
  ],
};
