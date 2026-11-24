// Round 46: the dark text inks lifted (DECISIONS 164 and 166). The owner chose option B of the colour and contrast research (DECISIONS 164) and the council voted it as
// rendered (DECISIONS 166): in dark, primary #ededed to #f4f4f4, secondary #a1a1a1 to #bababa, tertiary #858585 to #979797 and disabled #5c5c5c to #6c6c6c. Light is unchanged in
// every token. The focus colour, the more-contrast inks and the art mark follow, because each is an alias of an ink. The design panel has not reviewed this implementation.
//
// "Before" is not a screenshot from another build: the left column redraws the same Basalt parts with the four old dark inks put back by custom properties on its wrapper
// (and, because the aliases of an ink are resolved where they are declared, the same eight aliases put back with them). It applies in dark only, so in light both columns
// are the same pixels, and the readout says whether the computed colours match. Every word is synthetic. The readout is measured from the rendered DOM.

import * as React from "react";

import {
  Button,
  CodeBlock,
  Listbox,
  ListboxOption,
  Segment,
  SegmentedControl,
  Tab,
  Tabs,
  TabsList,
  Text,
  TimeChart,
} from "../../packages/react/src/index";
import { min, minSpoken, trainingData } from "../../packages/react/test/fixtures/chart-data";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap" };

type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** Runs `read` once the page has laid out, prints the lines it returns, and holds the shot until they are written (see round 41's Readout). */
function Readout({ read, title = "Measured on this page" }: { read: (root: HTMLElement) => string[]; title?: string }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const ready = React.useRef<{ promise: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    ready.current = { promise, done };
  }
  React.useLayoutEffect(() => {
    const own = ready.current!;
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([own.promise, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    return () => own.done();
  }, []);
  React.useEffect(() => {
    let live = true;
    const t = window.setTimeout(async () => {
      const root = ref.current?.closest("[data-round46]") as HTMLElement | null;
      let next: string[];
      try { next = root ? read(root) : ["(no page to measure)"]; } catch (error) { next = [`(the measurement failed: ${error instanceof Error ? error.message : String(error)})`]; }
      if (!live) return;
      setLines(next);
      await frames(3);
      if (live) ready.current?.done();
    }, 1200);
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <pre ref={ref} style={mono}>{`${title}\n${lines.join("\n")}`}</pre>;
}

// The four old dark inks, and the eight aliases that follow an ink. In dark only: [data-theme="dark"] is the review page's own root attribute.
const BEFORE = `
[data-theme="dark"] [data-ink="before"] {
  --basalt-text-primary: #ededed;
  --basalt-text-secondary: #a1a1a1;
  --basalt-text-tertiary: #858585;
  --basalt-text-disabled: #5c5c5c;
  --basalt-border-focus: var(--basalt-text-secondary);
  --basalt-ink-contrast: var(--basalt-text-secondary);
  --basalt-field-contrast: var(--basalt-text-secondary);
  --basalt-chart-observed: var(--basalt-text-primary);
  --basalt-chart-plan: var(--basalt-text-secondary);
  --basalt-chart-axis: var(--basalt-text-tertiary);
  --basalt-syntax-comment: var(--basalt-text-tertiary);
  --basalt-art-mark: var(--basalt-text-primary);
  color: var(--basalt-text-primary);
}`;

const CODE = `// the week's long run
const week = plan.filter((day) => day.long);
export const total = week.length;`;

/** One column: the same parts, drawn in whatever inks its wrapper holds. */
function Specimen({ which }: { which: "before" | "after" }) {
  const data = React.useMemo(() => trainingData(14), []);
  return (
    <div data-ink={which} style={{ ...col, flex: "1 1 340px", minWidth: 0, gap: 20 }}>
      <Text size="md" weight="medium">{which === "before" ? "Before (main)" : "After (this branch)"}</Text>

      <div style={col} data-probe="">
        <Text>Primary: body text, headings and labels</Text>
        <Text tone="secondary">Secondary: descriptions, metadata and unselected tabs</Text>
        <Text tone="tertiary">Tertiary: placeholders, shortcuts and hashes</Text>
        <Button disabled>Disabled</Button>
      </div>

      {/* A menu at rest with its active row, drawn with the menu's own classes (a popup cannot be open twice on one page). */}
      <div className="basalt-menu" data-level="1" role="presentation" style={{ position: "static", width: 260 }}>
        <div className="basalt-menu-group-label">Sandbox</div>
        <div className="basalt-menu-item" data-highlighted=""><span className="basalt-menu-item-label">New sandbox</span></div>
        <div className="basalt-menu-item"><span className="basalt-menu-item-label">Open recent</span></div>
        <div className="basalt-menu-item"><span className="basalt-menu-item-label">Settings</span></div>
      </div>

      <div style={col}>
        <Tabs value="week"><TabsList aria-label={`Range ${which}`}><Tab value="week">Week</Tab><Tab value="trends">Trends</Tab><Tab value="sources">Sources</Tab></TabsList></Tabs>
        <SegmentedControl aria-label={`View ${which}`} defaultValue="week"><Segment value="day">Day</Segment><Segment value="week">Week</Segment><Segment value="month">Month</Segment></SegmentedControl>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" aria-pressed>Pressed</Button>
          <Button variant="ghost" aria-pressed={false}>Not pressed</Button>
        </div>
      </div>

      <Listbox label={`Sessions ${which}`} defaultValue="b">
        <ListboxOption value="a" detail="Monday, 09:39">Long run</ListboxOption>
        <ListboxOption value="b" detail="Wednesday, 18:02">Tempo</ListboxOption>
        <ListboxOption value="c" detail="Saturday, 07:15">Recovery</ListboxOption>
      </Listbox>

      <div style={{ ...col, gap: 4 }}>
        <Text size="sm" tone="secondary">Updated 3 minutes ago · Watch</Text>
        <Text size="xs" tone="tertiary">Synthetic figures, for this page only.</Text>
      </div>

      <TimeChart
        title="Training" source="Watch · synthetic" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial}
        format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)} unit="min" summary="Training averaged 54 minutes a day over 14 days."
      />

      <CodeBlock language="typescript" title="plan.ts" code={CODE} copyable={false} />

      {/* The focus ring, drawn the way the control ring is (2px, offset 2px, the focus colour), because only one control can hold focus on a page. */}
      <div><Button style={{ outline: "2px solid var(--basalt-border-focus)", outlineOffset: 2 }}>Focus ring</Button></div>
    </div>
  );
}

function InkLadderDemo() {
  return (
    <div data-round46="" style={col}>
      <style>{BEFORE}</style>
      <Text size="sm" tone="secondary">Both columns are the same parts. The left has the four old dark inks put back; the right is what this branch ships. In light there is no difference.</Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <Specimen which="before" />
        <Specimen which="after" />
      </div>
      <Readout read={(root) => {
        const theme = document.documentElement.getAttribute("data-theme");
        // A computed colour may print as rgb() or oklch(); one pixel of a canvas turns either into the 8-bit sRGB the screen shows.
        const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const srgb = (css: string) => { pixel.clearRect(0, 0, 1, 1); pixel.fillStyle = "#000"; pixel.fillStyle = css; pixel.fillRect(0, 0, 1, 1); const d = pixel.getImageData(0, 0, 1, 1).data; return `#${[d[0]!, d[1]!, d[2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`; };
        const probe = (which: string) => [...root.querySelectorAll(`[data-ink="${which}"] [data-probe] > *`)].map((el) => srgb(getComputedStyle(el).color));
        const before = probe("before");
        const after = probe("after");
        const names = ["primary", "secondary", "tertiary", "disabled (button)"];
        const ring = (which: string) => srgb(getComputedStyle(root.querySelector(`[data-ink="${which}"] button:not([disabled]):last-of-type`)!).outlineColor);
        return [
          `theme: ${theme}`,
          ...names.map((n, i) => `${n}: before ${before[i]}, after ${after[i]}${before[i] === after[i] ? " (the same)" : ""}`),
          `focus ring: before ${ring("before")}, after ${ring("after")}${ring("before") === ring("after") ? " (the same)" : ""}`,
          theme === "light" ? `light: ${before.every((c, i) => c === after[i]) ? "every ink is the same in both columns, so light is unchanged" : "a light ink differs: light has changed"}` : "dark: the four inks differ; see the figures in DECISIONS 166 and foundations (Text)",
        ];
      }} />
    </div>
  );
}

const COMMON = { widths: [1440, 390], scales: [2], height: 1100 };

export const ROUND_46: Round = {
  id: "46",
  title: "The dark text inks lifted (option B, DECISIONS 164 and 166)",
  reviewed: false,
  summary:
    "The owner chose option B of the colour and contrast research (DECISIONS 164) and the council voted it as rendered (DECISIONS 166): in dark, primary goes from #ededed to #f4f4f4, secondary from #a1a1a1 to #bababa, tertiary from #858585 to #979797 and disabled from #5c5c5c to #6c6c6c. Light is unchanged in every token. The focus ring, the more-contrast inks and the art mark follow, because they are aliases of an ink. The step from primary to secondary is 1.75:1 in dark (it was 2.21:1) and 2.12:1 in light. Nothing else moved: the primary Button's fill is still #ededed. The design panel has not reviewed this implementation; the council's vote is DECISIONS 166.",
  steps: [
    {
      id: "ink-ladder", name: "The dark ink ladder, before and after", intro: "The same Basalt parts side by side: the left column has the four old dark inks put back by custom properties, the right is what ships. Dark shows the change; light, in the same page, shows that nothing moved.",
      ...COMMON,
      decisions: [
        "DECISIONS 164: the owner chose option B (\"B is fine\") of the colour and contrast research. DECISIONS 166: the council voted it as rendered, 3 of 3 on the ladder, the chosen state and display type; the muse ballot was pending and cannot change that result.",
        "Dark primary oklch(0.966 0 0) #f4f4f4 (Lc -101), secondary oklch(0.79 0 0) #bababa (Lc -65), tertiary oklch(0.675 0 0) #979797 (Lc -46), disabled oklch(0.53 0 0) #6c6c6c (Lc -26). The new primitives are neutral-95-7, neutral-73, neutral-59 and neutral-42-4; neutral-96 (#f5f5f5) and neutral-42 (#6b6b6b) are taken, so the two that would collide carry one decimal.",
        "The menu's active-row lift and the pressed toggle's ink step are smaller, 1.30x at worst (was 1.64x and 1.71x). Their guards are 1.29x, B's worst measured and rounded down (DECISIONS 166's mechanical rule). The step from primary to secondary is 1.75:1 in dark, 2.12:1 in light.",
        "Where tertiary now holds 4.5:1 on a wash or the menu's plate in dark, the rule that steps it to secondary is kept (no pixel was voted on); the tests assert the rule is applied and not that contrast forces it.",
      ],
      tryIt: ["Compare the two columns at 1440 and at 390 in dark: the menu's active row, the chosen tab and segment, the pressed toggle, the selected list row, the chart's axis, the code's comment and the focus ring.", "In light the two columns are identical, and the readout says so."],
      demo: () => <InkLadderDemo />,
    },
  ],
};
