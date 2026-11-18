// Round 48: the peek plate (DECISIONS 168 and 170). The owner chose how cut text is shown whole on three parts: the `Listbox` option and the `OpenList` row take opus's design (the
// row raised in place, every shown word on its pixel, the cut text carrying on below), and the `StatusBar` message takes muse's (the plate lifted clear of the bar into the page above
// it). The design panel has not reviewed this implementation; the designs are the prototypes' (`peek-plate/opus/` and `peek-plate/muse/`), built into the components with the faults
// the designers listed for the build. Every word is synthetic.
//
// The states are real code paths, not drawings. "hovered" sends the pointer-over the plate waits on (the tooltip's 600ms, then it opens) to the part's cut row, and "focused" moves
// keyboard focus to it; the shot waits for the plate to be open. "touch" is a coarse-pointer page (build.mjs emulates a phone): the listbox wraps at rest and has no plate, and the
// open list's row is held with a finger for 800ms (build.mjs). The "forced-colours" and "reduced-motion" states are the same page under those emulations.

import * as React from "react";

import { Button, Card, Listbox, ListboxGroup, ListboxOption, OpenList, OpenListGroup, OpenListRow, StatusBar, Text } from "../../packages/react/src/index";
import type { Round } from "./rounds";

type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/**
 * Drives a plate open for a shot. `hovered` sends the pointer-over to the part found by `find` (and again every 150ms, because the plate's code arrives on demand and a first event may
 * come before it has landed); `focused` focuses it. It stops once the plate is open, and holds the shot until it has been drawn for three frames.
 */
function useDrive(state: string, find: () => HTMLElement | null) {
  React.useEffect(() => {
    const hover = state.startsWith("hovered");
    const focus = state.startsWith("focused");
    if (!hover && !focus) return undefined;
    let live = true;
    let timer = 0;
    let done = () => {};
    const ready = new Promise<void>((resolve) => { done = resolve; });
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([ready, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    const tick = async () => {
      if (!live) return;
      if (document.querySelector(".basalt-peek[data-open]")) { await frames(3); if (live) done(); return; }
      const target = find();
      if (target) {
        if (hover) target.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
        else if (document.activeElement !== target) target.focus();
      }
      timer = window.setTimeout(tick, 150);
    };
    tick();
    return () => { live = false; window.clearTimeout(timer); done(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `find` reads the page's own parts and is fixed for the page
  }, [state]);
}

const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const SOURCES = [
  { group: "Work", value: "planning", name: "Quarterly planning notes and the meeting transcripts that go with them", trailing: "live", detail: "Read 4 minutes ago from the shared team folder: 1,284 files, 3 skipped as too large" },
  { group: "Work", value: "inbox", name: "Inbox", trailing: "soon" },
  { group: "Work", value: "tickets", name: "Support tickets", trailing: "live", detail: "Read an hour ago" },
  { group: "Work", value: "contracts", name: "Signed contracts, statements of work and every amendment since 2019", trailing: "live" },
  { group: "Code", value: "basalt", name: "basalt", trailing: "web" },
  { group: "Code", value: "logs", name: "Build logs from the nightly integration run on the shared runner", trailing: "data", detail: "Kept for 30 days" },
];

function ListboxDemo({ state }: { state: string }) {
  const [value, setValue] = React.useState("planning");
  const ref = React.useRef<HTMLDivElement>(null);
  useDrive(state, () => (state.startsWith("hovered") ? ref.current?.querySelector<HTMLElement>('[data-value="contracts"]') ?? null : ref.current?.querySelector<HTMLElement>('[role="listbox"]') ?? null));
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
      {caption(state.startsWith("touch") ? "A phone: there is no hover to open a plate, so the options wrap at rest. Nothing is cut, so none opens." : "A 360px pane. An option whose name or detail is cut shows it whole on a plate that is the option itself, raised.")}
      <Card style={{ padding: 4 }}>
        <Listbox label="Sources" value={value} onValueChange={setValue}>
          {["Work", "Code"].map((group) => (
            <ListboxGroup key={group} label={group}>
              {SOURCES.filter((s) => s.group === group).map((s) => <ListboxOption key={s.value} value={s.value} trailing={s.trailing} detail={s.detail}>{s.name}</ListboxOption>)}
            </ListboxGroup>
          ))}
        </Listbox>
      </Card>
    </div>
  );
}

const WORK = [
  { id: "payroll", name: "Payroll for November", part: "finance", state: "done", opens: "record" },
  { id: "lease", name: "Contract renewal for the north warehouse lease, its two amendments and the landlord's side letter on parking and loading hours", part: "legal", state: "waiting", opens: "record", detail: "Last changed by the facilities team on 12 November. Waiting on a signature from the landlord's agent, who asked for loading to start at 6 a.m." },
  { id: "onboarding", name: "Onboarding checklist", part: "people", state: "open", opens: "page", detail: "Three of eight steps done" },
  { id: "roadmap", name: "Roadmap", part: "product", state: "draft", opens: "page" },
  { id: "audit", name: "Access review for every shared drive and the two contractor accounts", part: "security", state: "open", opens: "record" },
];

function OpenListDemo({ state }: { state: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useDrive(state, () => (state.startsWith("hovered") ? ref.current?.querySelector<HTMLElement>('[data-open-row="lease"]') ?? null : ref.current?.querySelector<HTMLElement>('[data-open-row="lease"] [data-open-button]') ?? null));
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 880 }}>
      {caption(state.startsWith("touch") ? "A phone: the row keeps its ellipsis, and a finger held on it for 500ms opens the plate. The release opens nothing; the next touch elsewhere closes it." : "The row keeps its ellipsis at rest. Hover (after the wait) or focus raises the row: every word that showed stays where it was and the cut text carries on below.")}
      <Card style={{ padding: 4 }}>
        <OpenList label="Work">
          <OpenListGroup label="This week">
            {WORK.map((w) => <OpenListRow key={w.id} id={w.id} name={w.name} part={w.part} state={w.state} opens={w.opens} detail={w.detail} onOpen={() => {}} data-wt-hold={w.id === "lease" ? "" : undefined} />)}
          </OpenListGroup>
        </OpenList>
      </Card>
    </div>
  );
}

const STATUS_TEXT = "Not a command: “deploy staging --force” is a typed line, not one of the commands this run allows. Type / to see them, or press Esc to clear this line.";

function StatusDemo({ state, error }: { state: string; error?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  // The message is a focus stop only once it is measured cut, so the focus waits for it.
  useDrive(state, () => { const m = ref.current?.querySelector<HTMLElement>(".basalt-status-bar-message"); return m?.hasAttribute("data-cut") ? m : null; });
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {caption("From 720 the message keeps one truncated line. Hover (after the wait) or focus lifts its whole text clear of the bar into the page above it: the slot's width, its foot space-2 above the bar's top border.")}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 320, border: "1px solid var(--basalt-border-divider)", borderRadius: 12, overflow: "clip" }}>
        <div style={{ flex: 1, padding: 24 }}><Text size="sm" tone="tertiary">The page above the bar. The plate opens into this space.</Text></div>
        <StatusBar
          start={<Button variant="ghost" size="sm">run 4f2a</Button>}
          sources={<Button variant="ghost" size="sm">2 sources</Button>}
          message={{ text: error ? "Could not reach github, so nothing was saved, and the run stays queued until the connection comes back; try again later, or open the run's log to see which step stopped." : STATUS_TEXT, status: error ? "error" : undefined, id: 1 }}
          end={<Button variant="ghost" size="sm">Theme</Button>}
        />
      </div>
    </div>
  );
}

const STATES = ["hovered", "focused", "hovered-forced-colours", "focused-reduced-motion"];
const LIST = { widths: [1440, 390], scales: [2], height: 620 };

export const ROUND_48: Round = {
  id: "48",
  title: "The peek plate: the whole text of a cut listbox option, open-list row and status message (DECISIONS 168 and 170)",
  reviewed: false,
  summary:
    "The owner chose how cut text is shown whole (DECISIONS 170: \"1 2 opus 3 muse\"). The listbox option and the open-list row take opus's design: the plate is the row itself raised to level 3, every word that was showing on its pixel and the cut text carrying on below. The status message takes muse's: the plate lifts clear of the bar into the page above it. Built into the components with the faults the designers listed for the build. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "listbox", name: "The listbox option", intro: "An option whose name or detail is cut shows it whole on its own raised plate. On a phone the options wrap at rest instead.", states: ["touch", ...STATES], ...LIST,
      decisions: [
        "DECISIONS 170: the Listbox option takes opus's design (the owner: \"1 2 opus 3 muse\"). DECISIONS 168: the plate as the ballot's mock drew it was rejected; the owner likes the hover for 1, and \"the wrap looks fine on 1\", which is the touch layout here.",
        "The plate is the option raised to level 3 (the one rim, shadow-overlay, radius 8); the option's own edges; the chevron or check, the name's first line and the trailing word on the pixels they were on; the name carries on across the full width and the detail follows whole. It grows downward and its foot never ends inside a line of the next option's text. The chosen option keeps its chosen fill.",
        "Hover opens it after the tooltip's wait (600ms, with the 400ms grace) and keyboard focus at once; Esc closes it and moves neither the pointer nor focus; it stays while the pointer is on it or focus stays (WCAG 1.4.13); it fades and never scales. A press on it chooses the option, and the list takes focus without the keyboard ring. The list's own ring stays on the list.",
        "Right to left mirrors the plate's seats; forced colours draw Canvas and CanvasText; reduced motion is opacity only. The measuring is the table's (cell-peek.ts's timings), with one Range for the whole list.",
      ],
      tryIt: ["Hover the third option and wait: the option lifts into a plate; move the pointer onto it and it stays; press it and it becomes the chosen option.", "Tab into the list: the plate is on the chosen option and follows ↑ and ↓; Esc closes it.", "On a phone (the touch shot) every option is whole at rest."],
      demo: ({ state }) => <ListboxDemo state={state} />,
    },
    {
      id: "open-list", name: "The open-list row", intro: "A row keeps its ellipsis at rest and, when its name, cells or second line are cut, raises into a plate that shows them whole. On a phone, a held finger opens it.", states: ["touch", ...STATES], ...LIST,
      decisions: [
        "DECISIONS 170: the OpenList row takes opus's design; DECISIONS 168: the owner's \"…\" stays at rest (wrapping looked terrible on 2).",
        "The plate is the row raised: the row's edges, the chevron, the name's first line, the cells and the word it opens into on their pixels; the name runs on under the cells across the row's width and the detail follows. The cursor row keeps its chosen fill while the list holds focus.",
        "Opened by the keyboard it carries the control ring at +2 round the plate and the row's own ring gives way. A press on it opens the row. On touch a 500ms long press opens it; the release opens nothing, and a touch elsewhere closes it.",
      ],
      tryIt: ["Hover the long second row and wait; move onto the plate and press it.", "Tab to the cursor row and press ↓ to the long row: the ring goes round the plate.", "In the touch shot the finger is held on the long row."],
      demo: ({ state }) => <OpenListDemo state={state} />,
    },
    {
      id: "status", name: "The status bar's message", intro: "From 720 a cut message lifts clear of the bar into the page above it; the bar keeps its truncated line and its height.", states: STATES, widths: [1440, 720], scales: [2], height: 560,
      decisions: [
        "DECISIONS 170: the StatusBar message takes muse's design; DECISIONS 168: the plate as the ballot's mock drew it was rejected (it grew down and the bar clipped it).",
        "The plate is the slot's width, its foot space-2 above the bar's top border; it covers none of the bar's controls and the bar's edge can never clip it. A cut message is one focus stop only while it is cut, named by its words (`role=\"note\"`); the live regions still do the speaking, then let go of the words, so a screen reader meets them in one place.",
        "An error message's XCircle sits before the first line on the plate. Under 720 the shipped bar already wraps the message above itself, so no plate is needed.",
      ],
      tryIt: ["Hover the message and wait; move onto the plate; Esc closes it.", "Tab to the message: the ring goes round the plate; after Esc the message shows its own ring."],
      demo: ({ state }) => <StatusDemo state={state} />,
    },
    {
      id: "status-error", name: "The status bar's error message", intro: "An error carries the XCircle in its 16px seat and the danger ink, on the bar and on the plate.", states: ["hovered", "focused"], widths: [1440, 720], scales: [2], height: 560,
      decisions: ["The XCircle and the danger ink are the bar's own, cloned onto the plate; the words say what went wrong, so colour carries nothing alone."],
      tryIt: ["Hover the message and wait."],
      demo: ({ state }) => <StatusDemo state={state} error />,
    },
  ],
};
