// Round 88: micro-details m5, waits and transient feedback (DECISIONS 405, 409; decided by the council's light round, Opus deciding over Neon's draft and
// Astra's check). Before and after for the two parts whose pixels change: the HTML skill's busy .btn (at rest, busy, the ring, its tail, forced colours)
// and a timed toast whose Undo asks the server (React's and the skill's). Built by Opus; the implementation has not been reviewed; the tests are written
// and not run (DECISIONS 359). Synthetic data in unlike domains: a newsletter's drafts and a mail archive.

import * as React from "react";

import { useToast } from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const NOT_REVIEWED = "Decided by the council's light round (DECISIONS 405, 409); the implementation has not been reviewed. The tests are written and not run (DECISIONS 359).";

function useRootTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

/** A page compose.mjs built for this round, in a frame, in the review page's theme. */
function SkillFrame({ page, title, height, press = false }: { page: string; title: string; height: number; press?: boolean }) {
  const theme = useRootTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[page] ?? "").replace("__THEME__", theme).replace("__PRESS__", press ? "yes" : "no"), [page, theme, press]);
  return (
    <>
      {/* sink: a page compose.mjs built at review-build time from this round's synthetic body (round88-skill.mjs); the frame runs the page's own script */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script */}
      <iframe title={title} srcDoc={source} style={{ width: "100%", height, border: 0, display: "block" }} />
    </>
  );
}

// ---- The skill's busy .btn ----

function SkillButtons({ state }: { state: string }) {
  const before = state.startsWith("before");
  return (
    <div>
      <p style={label}>
        {before
          ? "Before (main's parts): a wait marked as foundations asks (aria-busy with aria-disabled) is drawn as disabled, with the ring at once; in forced colours the ring is a full circle"
          : "This build: busy keeps its ink and edge, the label stays until 300ms, the ring then sits over the kept label, and it holds 400ms after the answer; in forced colours the ring is an arc"}
      </p>
      {/* Under 720 the four columns stack, so the frame is as tall as all of them. */}
      <SkillFrame page={before ? "88-buttons-before" : "88-buttons"} title="The HTML skill's busy buttons" height={typeof window !== "undefined" && window.innerWidth < 720 ? 720 : 300} />
    </div>
  );
}

// ---- A timed toast with an async Undo ----

const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * One timed toast (3s, its home the row) whose Undo asks the server and never answers here. "after-pressed" presses Undo 400ms in, by script (no pointer on
 * the stack and no focus in it, so only the action's wait holds the clock). "before-pressed" presses an Undo that returns nothing: on main a promise from
 * the action was not waited for, so main drew the same, the label kept and the line running on.
 */
function ToastSpecimen({ state }: { state: string }) {
  const toast = useToast();
  const pressed = state.endsWith("pressed");
  const before = state.startsWith("before");
  React.useEffect(() => {
    const id = toast.show({
      title: "Archived",
      description: "3 messages moved to Archive.",
      home: "row",
      timeout: 3000,
      action: { label: "Undo", keys: "Mod+Z", onClick: before ? () => {} : () => new Promise<void>(() => {}) },
    });
    const press = pressed ? pause(400).then(() => document.querySelector<HTMLButtonElement>(".basalt-toast-action")?.click()) : Promise.resolve();
    (window as unknown as { __BASALT_READY__?: Promise<unknown> }).__BASALT_READY__ = press.then(() => pause(pressed ? 1100 : 200));
    return () => toast.close(id);
  }, [toast, pressed, before]);
  return (
    <p style={label}>
      {state === "default"
        ? "At rest: the action is now a Basalt Button (secondary, extra small), drawn as it was"
        : before
          ? "Before (main): Undo pressed at 0.4s; a promise from it was not waited for, so the label stayed, a second press would call it again, and the line ran on (here at about 1.8s of 3s)"
          : "This build: Undo pressed at 0.4s; the ring over the kept label from 0.7s, and the toast's line and clock paused at 0.4s until the answer"}
    </p>
  );
}

function SkillToast({ state }: { state: string }) {
  const before = state.startsWith("before");
  // The frame presses Undo 400ms after it loads: the shot waits for the ring (from 700ms) and a visible run of the line.
  React.useEffect(() => { (window as unknown as { __BASALT_READY__?: Promise<unknown> }).__BASALT_READY__ = pause(state.endsWith("pressed") ? 1800 : 600); }, [state]);
  return (
    <div>
      <p style={label}>{before ? "Before (main's parts): the skill's toast, Undo pressed at 0.4s: nothing waits, the line runs on" : "This build: the skill's toast, Undo pressed at 0.4s: Basalt.wait's ring, the line and the clock paused"}</p>
      <SkillFrame page={before ? "88-toast-before" : "88-toast"} title="The HTML skill's toast" height={260} press={state.endsWith("pressed")} />
    </div>
  );
}

export const ROUND_88: Round = {
  id: "88",
  title: "Micro-details m5: waits and transient feedback",
  reviewed: false,
  summary:
    "The council's m5 decision (DECISIONS 405, 409), built in React and the HTML skill. toast.promise keeps the wait's two timings: no running toast for work under 300ms, and once one is on screen it stays 400ms before its result, either way. A toast's action is a Basalt Button, so an Undo that asks the server waits as every Button does, and while it waits that toast's clock and line pause and it is never closed to make room. The HTML skill gains the wait module (Basalt.wait), and its busy .btn is no longer drawn as disabled, shows no press while busy, and draws its ring as an arc in forced colours. Focus on a toast's action or Dismiss survives an update in both. Each changed part leads with before and after.",
  steps: [
    {
      id: "skill-button",
      name: "Before and after: the HTML skill's busy button",
      intro: "Each column is one moment of a wait, written as Basalt.wait writes it: at rest, from the press (busy, no ring yet), from 300ms (the ring over the kept label) and after the answer (free, the ring's last 400ms). The last row's button runs a real wait.",
      decisions: [
        "Busy is not disabled: a waiting button keeps its variant's ink, edge and hover, as React's does; only a real disabled, or aria-disabled without aria-busy, draws the disabled look.",
        "The ring follows the look: it needs data-loading, or a static aria-busy (React's loading, at once). Basalt.wait marks its first 300ms data-busy, so a quick answer shows nothing.",
        "No press look (colour step or .98) while busy or while the ring shows; a press in the ring's tail goes through and shows nothing. The cursor is progress.",
        "In forced colours the ring and the spinner are an arc in ButtonText on transparent sides (forced-color-adjust: none), held and under reduced motion too.",
        "\"Before\" is the same markup with main's own core, spinner and loops CSS.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press \"Send the newsletter\": nothing for 300ms, then the ring, and the label back at 1.6s.", "Press it twice: one wait."],
      states: ["before", "before-forced-colours", "after-forced-colours"],
      widths: [1440, 390],
      height: 360,
      heights: { "default@390": 900, "before@390": 900, "before-forced-colours@390": 900, "after-forced-colours@390": 900 },
      demo: ({ state }) => <SkillButtons state={state} />,
    },
    {
      id: "toast",
      name: "Before and after: a timed toast with an async Undo (React)",
      intro: "A three-second toast whose home is the row, so it times out, and whose Undo asks the server. The shot after a press is taken 1.4s later, so a running line has visibly moved on.",
      decisions: [
        "The action is a Basalt Button (secondary, extra small) rendered through Base UI's action, so it waits as every Button does: busy from the press, the ring after 300ms held 400ms, presses ignored, its label and width kept (0px at rest and pressed).",
        "While it waits, that toast's clock and line pause (and resume with what was left), and it is never closed to make room for a newer toast. Dismiss and a swipe still close it.",
        "An update keeps the action's element, so focus on it survives; an update that removes a focused action moves focus to the toast first.",
        "Basalt ships no optimistic store or rollback: the app owns the snapshot and the Undo. The recipe is in foundations, under Toasts.",
        NOT_REVIEWED,
      ],
      tryIt: ["Reload with \"after-pressed\" and compare the line with \"before-pressed\"."],
      states: ["before-pressed", "after-pressed"],
      widths: [1440, 390],
      height: 320,
      demo: ({ state }) => <ToastSpecimen state={state} />,
    },
    {
      id: "skill-toast",
      name: "Before and after: the same toast in the HTML skill",
      intro: "The skill's toast takes the same rule through Basalt.wait. Its parts are made once and written in place, so focus on Undo or Dismiss survives an update.",
      decisions: ["\"Before\" is the same page with main's toast script and CSS parts.", NOT_REVIEWED],
      tryIt: ["Press Undo in the frame: one call, the ring after 300ms, the line still."],
      states: ["before-pressed", "after-pressed"],
      widths: [1440, 390],
      height: 320,
      demo: ({ state }) => <SkillToast state={state} />,
    },
  ],
};
