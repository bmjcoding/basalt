import { PlayIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button, Chart, CodeBlock, LivePreview, MorphIcon, NumberTicker, Segment, SegmentedControl, Skeleton, Slide, Spinner, Stepper, Tab, Tabs, TabsList, TabsPanel, Text, TextMorph, TravelSpinner, useSlideDirection, useToast } from "../../packages/react/src/index";
import type { MorphName } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };

function LoadingDemo() {
  const [loading, setLoading] = React.useState(false);
  return (
    <div style={row}>
      <Button variant="primary" icon={PlayIcon} loading={loading} onClick={() => undefined}>
        Deploy
      </Button>
      <Button onClick={() => setLoading((value) => !value)}>{loading ? "Stop" : "Load"}</Button>
    </div>
  );
}

function TickerDemo() {
  const [value, setValue] = React.useState(1284);
  return (
    <div style={row}>
      <Text size="2xl" tabular>
        <NumberTicker value={value} />
      </Text>
      <Button size="sm" onClick={() => setValue((n) => n + 1)}>
        Add a run
      </Button>
    </div>
  );
}

export const ROUND_8: Round = {
  id: "8",
  title: "Motion and primitives",
  pr: "https://github.com/bmjcoding/basalt/pull/13",
  summary:
    "Spinners, press, ticker, morphing icons, text that keeps its letters, a breathing chart, a draining toast, and a preview before save. Colours and type are unchanged.",
  steps: [
    {
      id: "spinners",
      name: "Spinners",
      intro: "Ring for a compact wait, dots for a tight row, braille for mono and CLI lines. Pass a label when the spinner is the status.",
      decisions: [
        "The ring turns in 640ms. The grid walks its own snake in 660ms. Braille steps through one 530ms cycle.",
        "Reduced motion fades the ring and the dots, and holds the braille frame.",
        "A label makes it role=status. Without one, it is hidden from assistive technology.",
      ],
      tryIt: ["Compare the three.", "Turn on reduced motion: the ring fades and the braille frame holds."],
      demo: () => (
        <div style={row}>
          <Spinner label="Loading" />
          <Spinner variant="dots" label="Loading marks" />
          <Spinner variant="grid" label="Loading grid" />
          <Spinner variant="braille" label="Loading runs" />
          <Text size="sm" tone="secondary">Loading runs</Text>
        </div>
      ),
    },
    {
      id: "buttons",
      name: "Buttons",
      intro: "Hover and press ease out in 80ms. Primary darkens. Loading keeps the label's width and the variant colour, and draws a ring.",
      decisions: [
        "Primary darkens, and the control scales: .98 for a button, .94 for an icon button, .99 for a row.",
        "The focus ring stays instant.",
        "Loading is busy, not the disabled colour.",
      ],
      tryIt: ["Hold Deploy before it is loading.", "Press Load, then try to activate Deploy."],
      demo: () => (
        <div style={col}>
          <div style={row}>
            <Button variant="primary" icon={PlayIcon}>Deploy</Button>
            <Button>Cancel</Button>
            <Button variant="ghost">Preview</Button>
            <Button variant="danger">Delete</Button>
          </div>
          <LoadingDemo />
        </div>
      ),
    },
    {
      id: "ticker",
      name: "Number ticker",
      intro: "Digits roll on the slow duration, in tabular figures. Reduced motion snaps. The value is in the text either way.",
      decisions: ["One digit column per figure, so the width does not jump.", "Text tabular is the same figures without the roll."],
      tryIt: ["Add a run.", "Turn on reduced motion and add another: it snaps."],
      demo: () => <TickerDemo />,
    },
    {
      id: "copy",
      name: "Copy and skeleton",
      intro: "Copy morphs into a check. Skeletons pulse their opacity. A shimmer would be a gradient, so they don't.",
      decisions: ["The button name changes to Copied, and a status says so.", "Reduced motion swaps the icon immediately and holds the skeleton still."],
      tryIt: ["Copy the line.", "Watch the placeholder hold its size."],
      demo: () => (
        <div style={{ ...col, width: "100%", maxWidth: 480 }}>
          <CodeBlock code="basalt deploy --wait" language="bash" title="terminal" />
          <Skeleton width="40%" />
          <Skeleton width="90%" />
        </div>
      ),
    },
    {
      id: "morph",
      name: "Morphing icons",
      intro: "Every icon is three strokes. Arrows, chevrons, and plus/close rotate. Everything else interpolates, and unused strokes collapse to a point.",
      decisions: ["The set includes menu, close, plus, minus, check, play, pause, the four arrows, the four chevrons, copy, and a few more.", "Reduced motion swaps with no in-between."],
      tryIt: ["Cycle the icon.", "Turn on reduced motion and cycle again."],
      demo: () => <MorphDemo />,
    },
    {
      id: "persist",
      name: "Text, steps, and tabs",
      intro: "Shared letters stay. The step chevron becomes a check. A new panel enters from the side you moved.",
      decisions: ["One polite live region reads the whole string, not each letter.", "Reduced motion fades the panel instead of sliding it."],
      tryIt: ["Change Continue.", "Step forward to the last step.", "Move the window to the right."],
      demo: () => <PersistDemo />,
    },
    {
      id: "chart",
      name: "Chart and pending",
      intro: "A flat line breathes, then eases into the samples. A spinner can travel to where the pending work now lives. A toast drains a hairline, and it pauses while you hover.",
      decisions: ["No fill and no glow. An empty chart is a sentence.", "The range snaps outward so a new peak is not clipped."],
      tryIt: ["Show the runs.", "Send the run.", "Show the toast and hover it."],
      demo: () => <ChartDemo />,
    },
    {
      id: "preview",
      name: "Preview before save",
      intro: "The draft is visible before Save commits it. The field and the button stay; the preview words change.",
      decisions: ["Save stays unavailable until the draft differs from what is saved."],
      tryIt: ["Type a name.", "Save, and the committed name follows."],
      demo: () => <PreviewDemo />,
    },
  ],
};

const MORPH_CYCLE: MorphName[] = ["menu", "close", "plus", "minus", "check", "play", "pause", "arrow-right", "chevron-right", "copy"];

function MorphDemo() {
  const [index, setIndex] = React.useState(0);
  const name = MORPH_CYCLE[index]!;
  return (
    <div style={row}>
      <MorphIcon name={name} size={24} />
      <Button onClick={() => setIndex((current) => (current + 1) % MORPH_CYCLE.length)}>Cycle icon</Button>
      <Text size="sm" tone="secondary">{name}</Text>
    </div>
  );
}

function PersistDemo() {
  const [action, setAction] = React.useState("Continue");
  const [step, setStep] = React.useState("name");
  const [range, setRange] = React.useState("day");
  const direction = useSlideDirection(range, ["day", "week", "month"]);
  return (
    <div style={col}>
      <Button onClick={() => setAction((current) => (current === "Continue" ? "Confirm" : "Continue"))}>
        <TextMorph text={action} />
      </Button>
      <Stepper
        steps={[
          { id: "name", label: "Name the sandbox" },
          { id: "route", label: "Choose a route" },
          { id: "review", label: "Review" },
        ]}
        value={step}
        onValueChange={setStep}
      />
      <SegmentedControl aria-label="Window" value={range} onValueChange={setRange}>
        <Segment value="day">Day</Segment>
        <Segment value="week">Week</Segment>
        <Segment value="month">Month</Segment>
      </SegmentedControl>
      <Slide direction={direction} changeKey={range}>
        <Text>Showing the {range}</Text>
      </Slide>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Sandbox sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="runs">Runs</Tab>
          <Tab value="settings">Settings</Tab>
        </TabsList>
        <TabsPanel value="overview"><Text>Overview stays until you move.</Text></TabsPanel>
        <TabsPanel value="runs"><Text>Runs slide in from the right.</Text></TabsPanel>
        <TabsPanel value="settings"><Text>Settings slide in from the right.</Text></TabsPanel>
      </Tabs>
    </div>
  );
}

function ChartDemo() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<number[]>([]);
  const [travel, setTravel] = React.useState(false);
  const fromRef = React.useRef<HTMLSpanElement>(null);
  const toRef = React.useRef<HTMLSpanElement>(null);
  return (
    <div style={{ ...col, width: "100%", maxWidth: 420 }}>
      <Chart label="Run volume" data={data} loading={loading} empty="No runs yet" />
      <div style={row}>
        <Button onClick={() => { setData([2, 3, 2, 5, 4, 6]); setLoading(false); }}>Show runs</Button>
        <span ref={fromRef}><Button onClick={() => setTravel(true)}>Send run</Button></span>
        <span ref={toRef}><Text size="sm">Runs</Text></span>
        <TravelSpinner active={travel} fromRef={fromRef} toRef={toRef} label="Run pending" />
        <Button onClick={() => toast.show({ title: "Route saved", timeout: 8000 })}>Show toast</Button>
      </div>
    </div>
  );
}

function PreviewDemo() {
  const [saved, setSaved] = React.useState("blacksand");
  return (
    <div style={{ ...col, width: "100%", maxWidth: 360 }}>
      <LivePreview label="Display name" saved={saved} onSave={setSaved} />
      <Text size="sm" tone="secondary">Saved: {saved}</Text>
    </div>
  );
}
