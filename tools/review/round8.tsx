import { PlayIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button, CodeBlock, LivePreview, MorphIcon, NumberTicker, Segment, SegmentedControl, Skeleton, Slide, Spinner, Sparkline, Stepper, Tab, Tabs, TabsList, TabsPanel, Text, TextMorph, TravelSpinner, useSlideDirection, useToast } from "../../packages/react/src/index";
import { ArrowRightGlyph, CheckGlyph, ChevronRightGlyph, CloseGlyph, MenuGlyph, MinusGlyph, PlusGlyph } from "../../packages/react/src/glyph-set";
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
  reviewed: false,
  summary:
    "Spinners, press, ticker, morphing icons, text that keeps its letters, a breathing line, a draining toast, and a preview before save. Colours and type are unchanged. This round was built before the panel saw it, and shows the result of the panel's later rulings (round 9): fewer spinners and icons, a colour press, main's motion scale and Sparkline in place of Chart.",
  steps: [
    {
      id: "spinners",
      name: "Spinners",
      intro: "Ring for a compact wait, braille for mono and CLI lines. Pass a label when the spinner is the status.",
      decisions: [
        "The ring turns in 640ms. Braille is a 2 by 4 SVG dot matrix that steps through one 530ms cycle.",
        "Reduced motion fades the ring, and holds the braille frame.",
        "A label makes it role=status. Without one, it is hidden from assistive technology.",
      ],
      tryIt: ["Compare the two.", "Turn on reduced motion: the ring fades and the braille frame holds."],
      demo: () => (
        <div style={row}>
          <Spinner label="Loading" />
          <Spinner variant="braille" label="Loading runs" />
          <Text size="sm" tone="secondary">Loading runs</Text>
        </div>
      ),
    },
    {
      id: "buttons",
      name: "Buttons",
      intro: "Hover and press ease out in 100ms. A press is a colour step. Loading keeps the label's width and the variant colour, and draws a ring.",
      decisions: [
        "Primary steps to a pressed fill and the other variants to the selected wash. There is no scale on press.",
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
      intro: "Copy swaps to a check, both Phosphor Bold. Skeletons pulse their opacity. A shimmer would be a gradient, so they don't.",
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
      decisions: ["The set is menu, close, plus, minus, check, the four arrows and the four chevrons: only shapes Phosphor also draws.", "Reduced motion swaps with no in-between."],
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
      name: "Sparkline and pending",
      intro: "A flat line breathes, then eases into the samples. A spinner can travel to where the pending work now lives. A toast drains a hairline, and it pauses while you hover.",
      decisions: ["No fill and no glow. An empty sparkline is a sentence.", "The range widens at once so a new peak is not clipped, and eases back in."],
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

const MORPH_CYCLE = [["menu", MenuGlyph], ["close", CloseGlyph], ["plus", PlusGlyph], ["minus", MinusGlyph], ["check", CheckGlyph], ["arrow-right", ArrowRightGlyph], ["chevron-right", ChevronRightGlyph]] as const;

function MorphDemo() {
  const [index, setIndex] = React.useState(0);
  const [name, glyph] = MORPH_CYCLE[index]!;
  return (
    <div style={row}>
      <MorphIcon glyph={glyph} size={24} />
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
      <Sparkline label="Run volume" data={data} loading={loading} empty="No runs yet" />
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
