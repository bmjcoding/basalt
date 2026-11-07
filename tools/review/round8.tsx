import { PlayIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button, CodeBlock, NumberTicker, Skeleton, Spinner, Text } from "../../packages/react/src/index";
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
  pr: "https://github.com/bmjcoding/basalt/pull/12",
  summary:
    "Spinners, a press, a loading button, rolling digits and a copy check. Colours, type and themes are unchanged. A press darkens and scales; reduced motion drops the scale.",
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
      intro: "Copy swaps to a check. Skeletons pulse their opacity. A shimmer would be a gradient, so they don't.",
      decisions: ["The button name changes to Copied, and a status says so.", "Reduced motion holds the skeleton still."],
      tryIt: ["Copy the line.", "Watch the placeholder hold its size."],
      demo: () => (
        <div style={{ ...col, width: "100%", maxWidth: 480 }}>
          <CodeBlock code="basalt deploy --wait" language="bash" title="terminal" />
          <Skeleton width="40%" />
          <Skeleton width="90%" />
        </div>
      ),
    },
  ],
};
