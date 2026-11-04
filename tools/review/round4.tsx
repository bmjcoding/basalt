// Round 4: status and content components for the deploy console and the sites.

import * as React from "react";

import {
  Accordion,
  AccordionItem,
  Button,
  Callout,
  Field,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  Progress,
  Skeleton,
  Spinner,
  Textarea,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";
import { CodeDemo } from "./code-demo";
import { DensityDemo } from "./density-demo";

const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };
const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };

function ProgressDemo() {
  const [value, setValue] = React.useState(42);
  return (
    <div style={col}>
      <div style={{ ...row, gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Progress label="Building image" value={value} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Progress label="Waiting for a node" value={null} />
        </div>
      </div>
      <div style={row}>
        <Button size="sm" onClick={() => setValue((v) => Math.max(0, v - 10))}>−10</Button>
        <Button size="sm" onClick={() => setValue((v) => Math.min(100, v + 10))}>+10</Button>
      </div>
    </div>
  );
}

function LoadingDemo() {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div style={col}>
      <div style={row}>
        <Button size="sm" onClick={() => setLoaded((v) => !v)}>{loaded ? "Show loading" : "Finish loading"}</Button>
        {loaded ? null : (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--basalt-text-secondary)" }}>
            <Spinner /> Loading runs
          </span>
        )}
      </div>
      <div style={{ ...col, gap: 8, maxWidth: 360 }} aria-busy={!loaded}>
        {loaded ? (
          <>
            <div style={{ fontWeight: 600 }}>run-0142</div>
            <div style={{ fontSize: 13, color: "var(--basalt-text-secondary)" }}>claude · 4m 12s · a81f3c2</div>
            <div style={{ height: 48, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--basalt-border-hairline)", display: "flex", alignItems: "center", padding: "0 16px", fontSize: 13 }}>3 files changed</div>
          </>
        ) : (
          <>
            <Skeleton width="40%" />
            <Skeleton width="90%" />
            <Skeleton shape="block" height={48} />
          </>
        )}
      </div>
    </div>
  );
}

export const ROUND_4: Round = {
  id: "4",
  title: "Status and content",
  pr: "https://github.com/bmjcoding/basalt/pull/5",
  summary: "Components for the deploy console and the sites: long-form input, anchored detail, inline messages, progress and loading, code, and expandable sections.",
  steps: [
    {
      id: "density",
      name: "Density and touch",
      intro: "The same control sizes in regular and compact mode, with a 44px target floor on touch screens.",
      decisions: [
        "Compact moves controls down one size, with 24px as the floor. The token scale stays unchanged.",
        "Set data-density on the app's html element so menus and other portalled controls inherit it. A nested default scope restores the regular scale.",
        "Touch keeps a 44px target even in compact mode. Text entry stays 16px on touch to prevent focus zoom on iOS.",
      ],
      tryIt: ["Toggle Compact controls and compare the five sizes.", "Try the same walkthrough on a touch screen: the targets stay large."],
      demo: () => <DensityDemo />,
    },
    {
      id: "textarea",
      name: "Textarea",
      intro: "Multi-line text, such as a task for an agent. Labelled by its Field, like Input.",
      decisions: ["It shares Input's boundary (3:1), focus outline and invalid state, and resizes vertically only."],
      tryIt: ["Click the label: focus moves to the textarea.", "Drag the corner to resize."],
      demo: () => (
        <div style={{ maxWidth: 520 }}>
          <Field label="Task" description="What the agent should do. Markdown is fine.">
            <Textarea defaultValue="Fix the dimmed ride rows that never reset, and open a PR." />
          </Field>
        </div>
      ),
    },
    {
      id: "popover",
      name: "Popover",
      intro: "Rich content anchored to a trigger: details, a short form. Esc or an outside click closes it.",
      decisions: ["Same surface, shadow and motion as Menu, so overlays read as one family.", "Its title names it for screen readers."],
      tryIt: ["Focus the button and press Enter, then Esc: focus returns."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={{ minHeight: state === "open" ? 160 : undefined }}>
          <Popover defaultOpen={state === "open"} modal={false}>
            <PopoverTrigger render={<Button>Route details</Button>} />
            <PopoverContent>
              <PopoverTitle>anthropic</PopoverTitle>
              <PopoverDescription>https://api.anthropic.com, key anthropic-key, 60 requests a minute.</PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
    {
      id: "callout",
      name: "Callout",
      intro: "An inline message that stays until the situation changes: a warning or error that needs a decision.",
      decisions: [
        "The surface stays neutral. Status is the icon's shape and colour, and the words: no coloured fill, no coloured left edge.",
        "Danger also colours its title, so it stands out at a glance: both designers found the cards too alike with only the icon.",
        "Only a callout that appears in response to something is announced; one present when the page loads isn't read out every time.",
      ],
      tryIt: ["Compare the shapes of the four icons: each status reads without colour."],
      demo: () => (
        <div style={{ ...col, maxWidth: 640 }}>
          <Callout status="warning" title="The tools image isn't pinned" actions={<Button size="sm">Pin to digest</Button>}>
            Runs use whatever agent-tools:latest points to. Pin it to a digest so every run uses the same tools.
          </Callout>
          <Callout status="danger" title="Route refused: api.example.com">This run isn't allowed to reach that host. Add it to the run's routes to allow it.</Callout>
          <Callout status="success" title="Signed commit verified">Every commit in this clone is signed by a listed key.</Callout>
          <Callout title="Records are kept for 30 days" />
        </div>
      ),
    },
    {
      id: "progress",
      name: "Progress",
      intro: "Progress of a task with a known end; an indeterminate bar while the end isn't known yet.",
      decisions: [
        "A 4px track filled with the input-boundary colour: its extent reads at 3:1 against the page. An outlined ring made it look like an input.",
        "The label is required: it names the bar.",
        "Under reduced motion the indeterminate bar pulses in place instead of sliding.",
      ],
      tryIt: ["Step the value with the buttons."],
      demo: () => <ProgressDemo />,
    },
    {
      id: "loading",
      name: "Spinner and Skeleton",
      intro: "A spinner for short waits; skeletons that hold the final layout so nothing jumps when content arrives.",
      decisions: [
        "Calmed in review: the skeleton pulse is 2s and only dips to 70%, and the spinner turns once a second.",
        "Skeletons use a new surface-placeholder token, visible on true black in dark mode.",
        "Skeletons are hidden from screen readers; loading is announced once, by the spinner's label or the region's busy state.",
        "Under reduced motion the spinner fades instead of turning, and skeletons hold still.",
      ],
      tryIt: ["Toggle between loading and loaded: the layout doesn't move."],
      demo: () => <LoadingDemo />,
    },
    {
      id: "code",
      name: "Code block",
      intro: "Language-aware code, commands or logs in Geist Mono. Syntax colours follow the selected theme; long lines scroll sideways rather than wrap.",
      decisions: [
        "Copy sits top right, in the title row when there is one: bottom right drifted away on short snippets and hid on long ones.",
        "The block is focusable so keyboard users can scroll it.",
        "Copy says \"Copied\" to screen readers as well as switching its icon.",
        "Shiki uses editor grammars. Blue keywords, green strings, amber constants, purple functions and teal types live only inside code; comments stay a readable grey.",
        "Every syntax colour meets AA in both themes. Plain text, unknown languages and logs over 100,000 characters stay readable without highlighting.",
      ],
      tryIt: ["Choose a language, then switch themes.", "Press Copy, then paste: the original text is preserved.", "Tab to the code and use the arrow keys to scroll."],
      states: ["typescript", "tsx", "swift", "json", "yaml", "python", "text", "html"],
      demo: ({ state }) => <CodeDemo initialLanguage={state === "default" ? "bash" : state} />,
    },
    {
      id: "accordion",
      name: "Accordion",
      intro: "Sections that expand, for secondary detail.",
      decisions: ["The caret and the panel move together, on the slow duration and the out curve; under reduced motion it just opens."],
      tryIt: ["Tab to a section and press Enter."],
      demo: () => (
        <div style={{ maxWidth: 560 }}>
          <Accordion defaultValue={["routes"]}>
            <AccordionItem value="routes" title="Routes">Each run reaches only the hosts you list, through the proxy.</AccordionItem>
            <AccordionItem value="keys" title="Keys">Keys stay outside the sandbox; the proxy adds them to requests it allows.</AccordionItem>
            <AccordionItem value="records" title="Records">Every run gets a record, including failed and cancelled ones.</AccordionItem>
          </Accordion>
        </div>
      ),
    },
  ],
};
