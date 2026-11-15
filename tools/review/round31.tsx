// Round 31: the third audit fix batch of the components stream (DECISIONS 133, audit-fix-c1). Slow lists, wasted work and two MultiSelect faults
// the full audit proved. Every item makes shipped behaviour faster without changing what is drawn, or restores behaviour the component's README
// already states, so AGENTS.md calls it engineering and there was no vote. No rendered pixel changes at rest (the build's pixel comparison against
// the base is in the PR); the one visible consequence is named in the last step. The design panel has not reviewed any of it.
//
// This round shows measurements. Each step has the component it is about, live, and the numbers beside it: "before" is the code this batch
// started from and "after" is this branch, from the audit's own scripts (median of five, Chrome with its CPU slowed four times, Apple M3 Max).
// The readouts marked "this page" are timed by the review page itself, in whatever browser is looking at it. Every name and number of data is synthetic.

import * as React from "react";
import { flushSync } from "react-dom";

import {
  Button,
  Checkbox,
  CodeBlock,
  MultiSelect,
  Spinner,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Text,
  TextMorph,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 720 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const mono = (text: React.ReactNode) => <Text size="sm" tone="secondary" mono>{text}</Text>;

/** Before and after, one line each, printed beside the component. The review page's own text, not Basalt's. */
function Numbers({ lines }: { lines: [string, string, string][] }) {
  return (
    <TableContainer label="Measured before and after">
      <Table columns={[{}, { width: 120 }, { width: 120 }]} minWidth={420}>
        <TableHeader>
          <TableRow>
            <TableHead>What was timed</TableHead>
            <TableHead numeric>Before</TableHead>
            <TableHead numeric>After</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map(([what, before, after]) => (
            <TableRow key={what}>
              <TableRowHead>{what}</TableRowHead>
              <TableCell numeric mono>{before}</TableCell>
              <TableCell numeric mono>{after}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet"];
const label = (i: number) => `${WORDS[i % 10]} ${WORDS[(i * 3 + 1) % 10]} ${i}`;

/** Times one synchronous update and the frame after it, in this browser. */
function useTimed() {
  const [ms, setMs] = React.useState<number | null>(null);
  const time = (update: () => void) => {
    const t0 = performance.now();
    flushSync(update);
    requestAnimationFrame(() => setMs(Math.round(performance.now() - t0)));
  };
  return [ms, time] as const;
}

// ---- 1. A table with a checkbox in every row ----

const RUNS = Array.from({ length: 1000 }, (_, i) => ({ id: `run-${String(i).padStart(4, "0")}`, name: label(i), agent: i % 2 ? "claude" : "codex", seconds: (i * 7919) % 3600 }));

function TickTable({ state }: { state: string }) {
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set());
  const [ms, time] = useTimed();
  // The app keeps each row's children as they were until that row's own choice changes, so a tick renders one row.
  const cache = React.useRef(new Map<string, { on: boolean; cells: React.ReactNode }>());
  const cells = (run: (typeof RUNS)[number], on: boolean) => {
    const hit = cache.current.get(run.id);
    if (hit && hit.on === on) return hit.cells;
    const made = (
      <>
        <TableCell>
          <Checkbox
            aria-label={`Select ${run.id}`}
            checked={on}
            onCheckedChange={(next) => time(() => setPicked((prev) => { const out = new Set(prev); if (next) out.add(run.id); else out.delete(run.id); return out; }))}
          />
        </TableCell>
        <TableRowHead>{run.id}</TableRowHead>
        <TableCell>{run.name}</TableCell>
        <TableCell>{run.agent}</TableCell>
        <TableCell numeric mono>{run.seconds}</TableCell>
      </>
    );
    cache.current.set(run.id, { on, cells: made });
    return made;
  };
  React.useEffect(() => {
    if (state === "ticked") window.setTimeout(() => document.querySelector<HTMLElement>("[aria-label='Select run-0003']")?.click(), 200);
  }, [state]);
  return (
    <div style={col}>
      {mono(ms === null ? "Tick a row: this page times the click to the next frame." : `Ticked: ${ms} ms to the next frame, in this browser, this page.`)}
      <div style={{ maxHeight: 280, overflow: "auto" }}>
        <TableContainer label="One thousand runs">
          <Table columns={[{ width: 44 }, { width: 120 }, {}, { width: 100 }, { width: 100 }]} minWidth={520}>
            <TableHeader>
              <TableRow>
                <TableHead>Pick</TableHead>
                <TableHead>Run</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead numeric>Seconds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RUNS.map((run) => (
                <TableRow key={run.id} selected={picked.has(run.id)}>{cells(run, picked.has(run.id))}</TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

// ---- 3. A checklist of a thousand ----

const OPTIONS = Array.from({ length: 1000 }, (_, i) => ({ value: `v${i}`, label: label(i) }));

function ChecklistDemo({ state }: { state: string }) {
  return (
    <div style={col}>
      {caption("Move the pointer down the list: the lit row follows it, and only the rows that change are drawn again.")}
      <MultiSelect label="Region" toolbar options={OPTIONS} />
      {state === "open" ? <OpenOnMount /> : null}
    </div>
  );
}

function OpenOnMount() {
  React.useEffect(() => {
    const id = window.setTimeout(() => document.querySelector<HTMLElement>(".basalt-filter-trigger")?.click(), 150);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}

// ---- 4. A hundred spinners ----

function SpinnerGrid() {
  const [round, setRound] = React.useState(0);
  const [ms, time] = useTimed();
  return (
    <div style={col}>
      <div style={row}>
        <Button onClick={() => time(() => setRound((n) => n + 1))}>Mount 100 again</Button>
        {mono(ms === null ? "this page times the mount" : `${ms} ms to the next frame, in this browser, this page`)}
      </div>
      <div key={round} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Array.from({ length: 100 }, (_, i) => <Spinner key={i} variant="braille" label={`Working ${i}`} />)}
      </div>
    </div>
  );
}

// ---- 5. A stepper and a label that morphs ----

function MorphDemo() {
  const steps = [{ id: "a", label: "Name" }, { id: "b", label: "Route" }, { id: "c", label: "Review" }];
  const [value, setValue] = React.useState("a");
  const [count, setCount] = React.useState(1204);
  return (
    <div style={col}>
      <Stepper steps={steps} value={value} onValueChange={setValue} />
      <div style={row}>
        <Button onClick={() => setCount((n) => n + 1)}>Count one more</Button>
        <Text><TextMorph text={`Build ${count.toLocaleString("en-US")} passed`} /></Text>
      </div>
    </div>
  );
}

// ---- 6. A long block of code ----

// Between 10,001 and 100,000 characters: over the first it is coloured after its plain text paints, under the second it is coloured at all.
const LONG = Array.from({ length: 700 }, (_, i) => `export function route${i}(host: string, limit = ${i}): string { return "https://" + host + "/v1?limit=" + limit; }`).join("\n");

function LongCode() {
  return (
    <div style={{ ...col, maxWidth: 900 }}>
      {caption(`${LONG.length.toLocaleString("en-US")} characters of TypeScript. The text shows at once; the colour follows when its grammar has loaded and the page has painted.`)}
      <CodeBlock language="typescript" title="routes.ts" code={LONG} />
    </div>
  );
}

// ---- 7. A disabled filter, in both forms ----

function DisabledFilters() {
  const four = [{ value: "a", label: "Ready" }, { value: "b", label: "Building" }, { value: "c", label: "Error" }];
  const eight = Array.from({ length: 8 }, (_, i) => ({ value: `v${i}`, label: `Option ${i + 1}` }));
  return (
    <div style={col}>
      {caption("Both are disabled and hold a choice. Neither can be changed: not a chip, not a row, not Clear.")}
      <MultiSelect label="Status" disabled defaultValue={["a"]} options={four} />
      <MultiSelect label="Region" disabled toolbar defaultValue={["v1", "v4"]} options={eight} />
    </div>
  );
}

function Veto() {
  const [heard, setHeard] = React.useState("nothing yet");
  return (
    <div style={col}>
      {caption("This filter's callback vetoes every change through the details it is given. A vetoed choice does not apply.")}
      <MultiSelect
        label="Status"
        options={[{ value: "a", label: "Ready" }, { value: "b", label: "Building" }]}
        onValueChange={(next, details) => { details.cancel(); setHeard(`${details.reason}: ${next.join(", ") || "none"} (vetoed)`); }}
      />
      {mono(`The callback heard: ${heard}`)}
    </div>
  );
}

// ---- 8. Importing the package in Node ----

export const ROUND_31: Round = {
  id: "31",
  title: "Slow lists, wasted work and two MultiSelect faults",
  summary: "The third audit fix batch: a table, a checklist and a hundred spinners do less work for the same picture; importing the package in Node loads a sixth of the files; a disabled MultiSelect holds still and a vetoed change is vetoed.",
  reviewed: false,
  steps: [
    {
      id: "table-rows",
      name: "A table renders the row that changed",
      intro: "TableRow, TableRowHead and TableCell are memoised: an app that keeps a row's props and children the same renders only the row that changed. A Table still renders every row, so a long one is paged.",
      widths: [1440, 390],
      scales: [1],
      height: 520,
      decisions: [
        "Engineering, no vote: no markup changes. Rendering only the rows in view would change what find-in-page and a screen reader meet, so it is not done; that is a design decision for the council if it is wanted.",
        "The README now says that a Table renders every row and that longer tables use Pagination.",
      ],
      tryIt: ["Tick a row in the table below: only that row is drawn again, and the page prints how long it took in your browser."],
      states: ["ticked"],
      demo: ({ state }) => (
        <div style={col}>
          <Numbers lines={[["Rows rendered for one tick, 200 rows", "200", "1"]]} />
          <TickTable state={state} />
        </div>
      ),
    },
    {
      id: "checklist",
      name: "A checklist of a thousand: the highlight draws two rows",
      intro: "Moving the pointer across a MultiSelect checklist lit the row under it by drawing every row again. Now the two rows that change are drawn.",
      widths: [1440, 390],
      scales: [1],
      height: 640,
      decisions: ["Engineering, no vote: the same markup and the same behaviour."],
      tryIt: ["Open the list and move the pointer down it."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={col}>
          <Numbers lines={[["Pointer moves one row, 1,000 options, slow device (script)", "388 ms", "8 ms"], ["Same, this machine (script)", "97 ms", "6 ms"]]} />
          <ChecklistDemo state={state} />
        </div>
      ),
    },
    {
      id: "spinners",
      name: "A hundred braille spinners mount without a style recalculation each",
      intro: "Each spinner asked for its animations at mount, which settles style, and a hundred spinners did it a hundred times. The commit's spinners now join the shared clock together. They still tick in phase, and one mounted later joins them.",
      widths: [1440, 390],
      scales: [1],
      height: 420,
      decisions: ["Engineering, no vote: the picture is the same. Phase, the release of the root hold and a spinner mounted while it is held are all tested."],
      tryIt: ["Press the button: the page prints the mount time in your browser."],
      demo: () => (
        <div style={col}>
          <Numbers lines={[["Style recalculations, one commit of 100", "102", "3"], ["Mount script, slow device", "331 ms", "7 ms"]]} />
          <SpinnerGrid />
        </div>
      ),
    },
    {
      id: "morph",
      name: "A stepper and a morphing label lay out once per change",
      intro: "TextMorph measured one character at a time and forced layout for each. It now writes every character, then reads every box in one pass.",
      widths: [1440, 390],
      scales: [1],
      height: 360,
      decisions: ["Engineering, no vote: each character is still measured alone, so the widths and the motion are the same."],
      tryIt: ["Step through the stepper, or count one more."],
      demo: () => (
        <div style={col}>
          <Numbers lines={[["Layouts, one change of a 20-character label", "42", "1"], ["50 labels change, slow device (script)", "396 ms", "53 ms"], ["20 steppers change, slow device (script)", "128 ms", "39 ms"]]} />
          <MorphDemo />
        </div>
      ),
    },
    {
      id: "long-code",
      name: "A long block of code paints, then takes its colour",
      intro: "A block of more than 10,000 characters used to be coloured inside the render that mounted it. In a browser its plain text now paints first and the colour follows, as the README says. A shorter block is coloured at once, as before.",
      widths: [1440, 390],
      scales: [1],
      height: 520,
      decisions: [
        "Engineering, no vote: which blocks are coloured, the 100,000-character cap and the colours are unchanged. Only a browser's own render waits: in server rendering and static markup a preloaded language still colours the block in the render, and the page that hydrates it keeps those colours from its first frame.",
      ],
      tryIt: ["Reload the page: the text is there at once, the colour a moment later."],
      demo: () => (
        <div style={{ ...col, maxWidth: 900 }}>
          <Numbers lines={[["Mount script, 99,000 characters, slow device", "601 ms", "2 ms"], ["Longest task after mounting, slow device", "986 ms", "762 ms"]]} />
          <LongCode />
        </div>
      ),
    },
    {
      id: "multiselect",
      name: "A disabled MultiSelect holds still, and a veto vetoes",
      intro: "A disabled filter could still be cleared, and a checklist open when it was disabled could still be ticked. Clear and every row now carry the filter's disabled state. A change vetoed through the details callback is now vetoed, as the README says.",
      widths: [1440, 390],
      scales: [1],
      height: 560,
      decisions: [
        "Engineering, no vote: it restores the behaviour the README and the disabled-control rule already state. The one thing that can be seen: in a disabled filter that holds a choice, Clear takes the disabled look it already has at zero. Nothing else is drawn differently.",
      ],
      tryIt: ["Try to tick, clear or open the two disabled filters. Then tick a value in the third: the callback vetoes it and it stays off."],
      demo: () => (
        <div style={col}>
          <DisabledFilters />
          <Veto />
        </div>
      ),
    },
    {
      id: "node-import",
      name: "Importing the package in Node loads a sixth of the files",
      intro: "Every component imported its icons from Phosphor's barrel, so importing any one loaded all of Phosphor. Each icon is now imported from its own module, which an app's own import of the same icon still shares.",
      widths: [1440, 390],
      scales: [1],
      height: 360,
      decisions: ["Engineering, no vote: the same icon modules. The opt-in weights plugin still works, and the bundles are the same size to within the spinner's 80 bytes."],
      tryIt: ["Nothing to try: this is what a server process, a test runner or a script pays at start."],
      demo: () => (
        <div style={col}>
          <Numbers lines={[["Files loaded by importing the package", "5,356", "869"], ["Of them Phosphor's", "4,541", "50"], ["Time to import, this machine", "1,146 ms", "348 ms"]]} />
        </div>
      ),
    },
  ],
};
