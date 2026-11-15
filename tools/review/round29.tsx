// Round 29: the first audit-fix batch of the components stream (DECISIONS 133, audit-fix-a). The full audit proved seven faults that can be seen here in which the
// code did not keep a behaviour that docs/foundations.md, docs/motion.md or the component's own README entry already states. Each fix
// restores that behaviour and decides nothing new, so there was no vote: AGENTS.md calls "bug fixes that restore documented behaviour"
// engineering. Nothing here is a new look, token or component. The design panel has not reviewed any of it. Every number and name is synthetic.
//
// Each step shows the case that was faulty, after the fix. The states are real: "reduced-motion" and "forced-colours" are emulations that
// build.mjs sets before the page loads. The demos drive themselves on mount (a render, a blur, a selection) so that one shot is the whole case.

import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  Combobox,
  Sparkline,
  Text,
  TimeChart,
  ToastProvider,
  useToast,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 720 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const mono = (text: React.ReactNode) => <Text size="sm" tone="secondary" mono>{text}</Text>;

// ---- 1. A chart that is sent the same numbers while it moves ----

const DAYS = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];

function EquivalentDemo() {
  const [values, setValues] = React.useState([4, 9, 7, 12, 6, 8, 10]);
  const [sent, setSent] = React.useState(0);
  React.useEffect(() => {
    // The numbers change, and the parent builds fresh arrays of the same numbers while the marks are still travelling.
    const next = [10, 5, 12, 7, 11, 6, 13];
    const timers = [window.setTimeout(() => setValues(next), 60), window.setTimeout(() => { setValues([...next]); setSent(1); }, 110), window.setTimeout(() => { setValues([...next]); setSent(2); }, 150)];
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return (
    <div style={col}>
      {caption("The values changed once. The parent then sent the same numbers again, twice, in new arrays, while the marks were still gliding. The marks come to rest on the new values, as they do when nothing is sent again.")}
      <Card>
        <CardContent>
          <TimeChart title="Build minutes" kind="line" days={DAYS} series={[{ id: "a", name: "Minutes", values }]} summary="Build minutes over seven days, ending at 13." format={String} fromZero />
        </CardContent>
      </Card>
      {mono(`Same numbers sent again: ${sent}. Last value: ${values[6]}.`)}
    </div>
  );
}

// ---- 2. Negative values in a bar chart ----

function NegativeDemo({ count = 7 }: { count?: number }) {
  const values = [-4, 3, 6, -2, 0, 5, -6].slice(0, count);
  const plan = { kind: "value" as const, label: "Target", values: [2, 2, 2, 2, 2, 2, 2].slice(0, count) };
  return (
    <div style={col}>
      {caption("A balance for seven days, from the zero baseline: up for a gain, down for a loss. The day at 0 draws no bar and reads “0”; a bar is never missing for a value that was observed.")}
      <Card>
        <CardContent>
          <TimeChart title="Balance" kind="bar" days={DAYS.slice(0, count)} series={[{ id: "a", name: "Balance", values }]} plan={plan} summary="Balance by day: minus 4, 3, 6, minus 2, 0, 5 and minus 6." format={(v) => (v < 0 ? `−${Math.abs(v)}` : String(v))} />
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 3. A toast raised while the window is blurred ----

function Raise({ state }: { state: string }) {
  const toast = useToast();
  const raised = React.useRef(false);
  React.useEffect(() => {
    if (raised.current) return;
    raised.current = true;
    // The window loses focus, and then an asynchronous result arrives and raises a toast.
    window.dispatchEvent(new Event("blur"));
    toast.show({ title: "Export finished", description: "The file is ready. It waits here until the window is active again.", timeout: 4000, home: "page" });
  }, [state, toast]);
  return null;
}

function BlurredDemo({ state }: { state: string }) {
  return (
    <ToastProvider>
      <div style={col}>
        {caption("The window was blurred before this toast arrived. Its line and its clock are both held, so it does not run out unseen. It counts down when the window is active again.")}
        <Raise state={state} />
        {mono("Window: blurred. Toast time left: held.")}
      </div>
    </ToastProvider>
  );
}

// ---- 4. A paused sparkline given new samples ----

function PausedDemo() {
  const [data, setData] = React.useState([10, 20]);
  const [paused, setPaused] = React.useState(true);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setData([20, 10]), 80);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div style={{ ...col, maxWidth: 360 }}>
      {caption("Paused, and its samples changed from 10, 20 to 20, 10. The line holds where it was, and the new samples wait. Resume, and it glides on to them.")}
      <Sparkline label="Requests" data={data} paused={paused} />
      <div style={row}>
        <Button variant="secondary" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</Button>
        {mono(`paused ${String(paused)}, samples ${data.join(", ")}`)}
      </div>
    </div>
  );
}

// ---- 5. A filtered list ----

const FRUIT = [{ value: "first", label: "First" }, ...Array.from({ length: 15 }, (_, i) => ({ value: `option-${i}`, label: `Option ${i + 1}` }))];

function FilteredDemo({ state }: { state: string }) {
  const [text, setText] = React.useState("");
  const [measure, setMeasure] = React.useState("measuring");
  const host = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Lit on the last row from the keyboard (the list is long, so that row is far down), then narrowed to one match.
    const timers = [
      window.setTimeout(() => host.current?.querySelector("input")?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })), 40),
      window.setTimeout(() => setText("First"), 100),
      window.setTimeout(() => {
        const popup = document.querySelector<HTMLElement>(".basalt-combobox-popup");
        const rows = document.querySelectorAll("[role=option]").length;
        if (popup) setMeasure(`${rows} ${rows === 1 ? "match" : "matches"}; the list scrolls ${popup.scrollHeight - popup.clientHeight}px past what it shows`);
      }, 200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [state]);
  return (
    <div ref={host} style={{ ...col, maxWidth: 360, minHeight: 360 }}>
      {caption("Sixteen options, the last one lit, then narrowed to one match. The lit plate went with the row it was on: the list is one row tall and has nothing to scroll to.")}
      {mono(measure)}
      <Combobox aria-label="Pick one" options={FRUIT} defaultOpen inputValue={text} onInputValueChange={setText} />
    </div>
  );
}

export const ROUND_29: Round = {
  id: "29",
  title: "Audit fixes, batch A: charts, toast, code, framed art, sparkline and the glide",
  reviewed: false,
  summary:
    "The first fix batch from the full audit (DECISIONS 133). Seven behaviours the documents already state, and the code did not keep: a chart that is sent the same numbers while it moves, negative bars, a toast raised in a blurred window, hydrating prompted code, a stale image decode, a paused sparkline given new samples, and a filtered list's glide plate. Nothing new is drawn and no token changed, so there was no vote. The design panel has not reviewed it. Copying a NumberTicker (A2-06) is not in this batch: its selected look is a pixel the council has not decided. The hydration fix (prompted code) and the shadcn aliases follow a nested theme change nothing you can see here, and are covered by tests.",
  steps: [
    {
      id: "chart-equivalent",
      name: "A chart sent the same numbers while it moves",
      intro: "TimeChart. A parent that rebuilds its arrays during a change no longer freezes the marks between the old and the new values.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: foundations, Charts / Motion, says a changed value glides with its marks and scale to the new value. A render of the same numbers in new arrays cancelled that glide; it now leaves it running.",
      ],
      tryIt: ["The line ends at 13, on the new values.", "Reload and watch the marks: they travel once and stop."],
      states: ["default", "reduced-motion", "forced-colours"],
      demo: () => <EquivalentDemo />,
    },
    {
      id: "chart-negative",
      name: "Negative values in a bar chart",
      intro: "TimeChart, kind bar. A negative value is a bar hanging from the zero baseline; before, it had no bar.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: the scale already reached below zero and the 1px baseline was already drawn at zero; only the bar was missing. It is square at both ends, as foundations says. Zero is a value and draws no bar.",
      ],
      tryIt: ["Move across the days with the arrow keys: each readout names its value, negative ones included."],
      states: ["default", "reduced-motion", "forced-colours"],
      demo: () => <NegativeDemo />,
    },
    {
      id: "toast-blurred",
      name: "A toast raised in a blurred window",
      intro: "Toast. A toast shown while the window is already blurred holds its line and its clock until the window is active again.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: foundations, Toasts, says the line and the clock pause together in a blurred window and in a hidden tab. The first toast after a blur missed the blur; the stack now watches the window for as long as it is mounted.",
      ],
      tryIt: ["Switch to another window, come back, and the toast starts its time then."],
      states: ["default", "reduced-motion", "forced-colours"],
      demo: ({ state }) => <BlurredDemo state={state} />,
    },
    {
      id: "sparkline-paused",
      name: "A paused sparkline given new samples",
      intro: "Sparkline. Paused holds the line still; resuming glides it on to the samples that arrived meanwhile.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 480,
      decisions: [
        "Engineering, no vote: the prop's own contract is “Freezes the morph. Resuming continues from where it stopped”. The samples now glide as the scale does, and hold with it. A render of the same samples in a new array changes nothing.",
      ],
      tryIt: ["Press Resume: the line glides from 10, 20 to 20, 10."],
      states: ["default", "reduced-motion", "forced-colours"],
      demo: () => <PausedDemo />,
    },
    {
      id: "filtered-list",
      name: "A filtered list",
      intro: "Combobox. Filtering to one match leaves no invisible plate holding the list open to scroll.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: the plate is decoration. Once its fade has finished it goes back to the corner of the list, so it adds nothing to what the list can scroll. The glide itself is unchanged.",
      ],
      tryIt: ["Open the list, move to the last option, then type First: the list shrinks to one row and does not scroll."],
      states: ["default", "reduced-motion", "forced-colours"],
      demo: ({ state }) => <FilteredDemo state={state} />,
    },
  ],
};
