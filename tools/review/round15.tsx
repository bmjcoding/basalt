// Round 15: the sliding pill, the hover glide in popups, and the callout icon in forced colours. The council converged and the
// owner approved the design (decisions 69 and 70); this is that design built as decided. The design panel has not reviewed
// this implementation.
//
// The states are real. "reduced-motion", "forced-colours" and "forced-mixed" are emulations that build.mjs sets before the page
// loads, and a state that ends in either takes the same emulation. "-lit" hovers the second row of the first popup. "-glide" hovers
// the first row, then the fourth, and holds the plate's transform 60ms into its 150ms move. "-fade" hovers a row, leaves the
// popup, and holds the fade 40ms in. "mid-move" holds the pills 70ms into their 200ms move. The held frames are the real
// transition, paused, not a drawing.

import { CaretDownIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Button,
  Callout,
  Combobox,
  CommandMenu,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Segment,
  SegmentedControl,
  Select,
  Tab,
  Tabs,
  TabsList,
  TabsPanel,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const TOKENS = ["fast", "base", "slow", "slower"] as const;

/**
 * Slow motion for the walkthrough only: it multiplies the four duration tokens on the page by ten, so a move the eye can't follow
 * at 150 or 200ms can be watched. The components don't know about it; they read the same tokens.
 */
function SlowMotion() {
  const [slow, setSlow] = React.useState("1");
  React.useEffect(() => {
    const root = document.documentElement;
    const originals = TOKENS.map((name) => {
      root.style.removeProperty(`--basalt-duration-${name}`);
      return [name, Number.parseFloat(getComputedStyle(root).getPropertyValue(`--basalt-duration-${name}`))] as const;
    });
    for (const [name, ms] of originals) {
      if (slow === "10" && Number.isFinite(ms)) root.style.setProperty(`--basalt-duration-${name}`, `${ms * 10}ms`);
    }
    return () => { for (const name of TOKENS) root.style.removeProperty(`--basalt-duration-${name}`); };
  }, [slow]);
  return (
    <div style={row}>
      <Caption>Speed</Caption>
      <SegmentedControl aria-label="Speed" value={slow} onValueChange={setSlow}>
        <Segment value="1">Normal</Segment>
        <Segment value="10">Slow ×10</Segment>
      </SegmentedControl>
    </div>
  );
}

/** Holds every CSS transition under `node` at `at` ms. The frame is the real transition, paused. */
function holdTransitions(node: Element, at: number) {
  for (const animation of node.getAnimations({ subtree: true })) {
    if (animation instanceof CSSTransition) {
      animation.pause();
      animation.currentTime = at;
    }
  }
}

// ---- 1. the sliding pill

function PillDemo({ state }: { state: string }) {
  const [range, setRange] = React.useState("24h");
  const [section, setSection] = React.useState("account");
  const stage = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state !== "mid-move") return;
    const timer = window.setTimeout(() => {
      const node = stage.current;
      if (!node) return;
      [...node.querySelectorAll<HTMLElement>(".basalt-segment")].at(-1)?.click();
      node.querySelectorAll<HTMLElement>(".basalt-tab")[3]?.click();
      requestAnimationFrame(() => holdTransitions(node, 70));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div style={col} ref={stage}>
      <SlowMotion />
      <Caption>Segmented control: one pill, travelling to the chosen segment{state === "mid-move" ? " (held 70ms into its 200ms move)" : ""}</Caption>
      <SegmentedControl aria-label="Time range" value={range} onValueChange={setRange}>
        <Segment value="1h">1h</Segment>
        <Segment value="24h">24h</Segment>
        <Segment value="7d">7d</Segment>
        <Segment value="30d">30d</Segment>
      </SegmentedControl>
      <Caption>Vertical tabs: the same pill in a track</Caption>
      <Tabs orientation="vertical" value={section} onValueChange={(next) => next && setSection(String(next))}>
        <TabsList aria-label="Sections">
          <Tab value="account">Account</Tab>
          <Tab value="billing">Billing</Tab>
          <Tab value="keys">Access keys</Tab>
          <Tab value="notifications">Notifications</Tab>
        </TabsList>
        <TabsPanel value="account">Account settings</TabsPanel>
        <TabsPanel value="billing">Billing and invoices</TabsPanel>
        <TabsPanel value="keys">Access keys</TabsPanel>
        <TabsPanel value="notifications">Notification preferences</TabsPanel>
      </Tabs>
      <Caption>Horizontal tabs keep their underline, which already slides</Caption>
      <Tabs defaultValue="runs">
        <TabsList aria-label="Views">
          <Tab value="runs">Runs</Tab>
          <Tab value="logs">Logs</Tab>
          <Tab value="usage">Usage</Tab>
        </TabsList>
        <TabsPanel value="runs">Runs</TabsPanel>
        <TabsPanel value="logs">Logs</TabsPanel>
        <TabsPanel value="usage">Usage</TabsPanel>
      </Tabs>
    </div>
  );
}

// ---- 2. the hover glide in Menu, Select and Combobox

const REGIONS = ["us-east", "us-west", "eu-central", "ap-south", "sa-east"].map((value) => ({ value, label: value }));

function GlideDemo({ state }: { state: string }) {
  const which = state === "default" ? "" : state.startsWith("select") ? "select" : state.startsWith("combobox") ? "combobox" : "menu";
  return (
    <div style={{ ...col, minHeight: 360 }}>
      <SlowMotion />
      <Caption>Move the pointer down the rows: one plate travels between them. Press a key: it moves at once. Leave: it stops and fades where it is.</Caption>
      <div style={row}>
        <Menu defaultOpen={which === "menu"}>
          <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Sandbox actions</Button>} />
          <MenuContent>
            <MenuGroup>
              <MenuGroupLabel>Sandbox</MenuGroupLabel>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem>Rename</MenuItem>
              <MenuItem>Move to project</MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem>Archive</MenuItem>
            <MenuItem danger>Delete</MenuItem>
          </MenuContent>
        </Menu>
        <div style={{ width: 200 }}>
          <Select aria-label="Region" defaultOpen={which === "select"} options={REGIONS} placeholder="Region" />
        </div>
        <div style={{ width: 200 }}>
          <Combobox aria-label="Zone" defaultOpen={which === "combobox"} options={REGIONS} placeholder="Zone" />
        </div>
      </div>
    </div>
  );
}

// ---- 3. the hover glide in the command menu

function CommandDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state.startsWith("open"));
  return (
    <div style={col}>
      <SlowMotion />
      <Button onClick={() => setOpen(true)}>Open commands</Button>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        groups={[
          {
            label: "Sandboxes",
            commands: [
              { id: "new", label: "New sandbox", onSelect: () => {} },
              { id: "dup", label: "Duplicate sandbox", onSelect: () => {} },
              { id: "rename", label: "Rename sandbox", onSelect: () => {} },
              { id: "del", label: "Delete sandbox", danger: true, onSelect: () => {} },
            ],
          },
          {
            label: "Runs",
            commands: [
              { id: "rerun", label: "Re-run last task", onSelect: () => {} },
              { id: "logs", label: "Open logs", onSelect: () => {} },
            ],
          },
        ]}
      />
    </div>
  );
}

// ---- 4. the callout icon in forced colours

function CalloutDemo() {
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      <Callout title="Heads up">A routine note.</Callout>
      <Callout status="success" title="Sandbox is ready">Its routes were published.</Callout>
      <Callout status="warning" title="Near the quota">You have used 90% of this month's minutes.</Callout>
      <Callout status="danger" title="Build failed">The run exited with code 1.</Callout>
    </div>
  );
}

export const ROUND_15: Round = {
  id: "15",
  title: "The sliding pill and the hover glide",
  reviewed: false,
  summary:
    "The council converged and the owner approved (decisions 69 and 70): the segmented control and vertical tabs slide one pill to the chosen item, and the rows of Menu, Select, Combobox and the command menu share one plate that follows the pointer. The row focus rule and the callout icon fix are here too. The multi-select, the callouts' colour treatment, navigation's glide and toasts are not in this round. This is the approved design built; the design panel has not reviewed this implementation. A slow-motion control is on each step.",
  steps: [
    {
      id: "pill",
      name: "The sliding pill",
      intro: "A segmented control and vertical tabs hold one pill, and it travels to the chosen item. The label's ink changes at the press and does not wait for it.",
      decisions: [
        "Approved: the pill moves by transform and width (height for the vertical list) on duration-slow with ease-out, whatever the distance. It is a transition, so a second change turns it from where it is. The label's ink eases over duration-fast from the press.",
        "Vertical tabs: #27's \"no sliding indicator\" now reads \"the chosen tab's pill slides as the segmented control's does\". The horizontal underline already slid and is unchanged. Segmented keeps its 28px geometry and touch targets stay at least 44px.",
        "The shared pill is an enhancement over each item painting its own pill. It shows only once JS has measured the chosen item, and never under reduced motion or in forced colours. Under reduced motion each item paints its own pill and fades it over 100ms; in forced colours each is Highlight with HighlightText and no backplate box.",
        "The measuring writes four CSS variables on the control, re-measures on resize, when fonts load and on a turn of the screen, and snaps for those. No animation frame is in React state, and the observers go with the control.",
        "A multi-select is not here and does not slide: it is being redesigned.",
      ],
      tryIt: [
        "Choose 30d, then 1h, and choose 7d before the pill arrives: it turns from where it is.",
        "Turn on Slow ×10 and watch the pill and the ink: the ink is already lit when the pill has barely left.",
        "Turn on reduced motion: each item fades its own pill. Turn on forced colours: Highlight on HighlightText.",
      ],
      states: ["mid-move", "reduced-motion", "forced-colours"],
      demo: ({ state }) => <PillDemo state={state} />,
    },
    {
      id: "glide",
      name: "The hover glide in Menu, Select and Combobox",
      intro: "One plate per popup follows the pointer between rows. Each row's own plate is the fallback underneath, and it is what shows with no script.",
      decisions: [
        "Approved: the glide takes duration-base (150ms) on ease-out, whatever the distance. Base UI's highlight stays the authority for which row is active; the glide only paints it.",
        "Entering from outside, the plate appears on the row in place at once. Leaving freezes a move where it is and fades the plate in place over duration-fast on ease-in. If the pointer reaches a row while it fades, the plate travels from where it is and returns to full opacity; after the fade it appears in place.",
        "The keyboard: arrows, Home and End move the highlight at once, with no travel, because in a popup the plate is the keyboard position. A pointer glides it; the last input decides.",
        "Off on touch (hover: none, a coarse pointer, or a touch pointerType), where a press lights the row as today; off under reduced motion, where each row lights on its own, in at once and out with a 100ms fade; off in forced colours, where each row is Highlight on HighlightText.",
        "The plate is aria-hidden and pointer-inert. The row focus rule is in foundations; Basalt ships no focusable list row to apply it to (the accordion trigger is the one band that is itself a button, and is left as built).",
      ],
      tryIt: [
        "Open the menu and sweep down the rows, then leave the popup mid-move.",
        "Press the arrow keys, Home and End: the plate is there at once.",
        "Turn on Slow ×10 to watch the travel and the fade. Open the Select and the Combobox.",
      ],
      states: ["menu", "menu-glide", "menu-fade", "select-lit", "combobox-lit", "menu-forced-colours-lit", "menu-reduced-motion-lit"],
      demo: ({ state }) => <GlideDemo state={state} />,
    },
    {
      id: "command",
      name: "The hover glide in the command menu",
      intro: "The command menu's rows are the same rows with a taller plate. cmdk keeps one row selected, so the plate is always on it.",
      decisions: [
        "Approved: the command menu keeps its plate when the pointer leaves, as #27 says, so it never fades; the pointer moves it from the selected row to the next on duration-base.",
        "Open interpretation, for the panel: because cmdk selects the first row on open, the plate is already there when the pointer comes in, so it travels from the selected row rather than appearing in place. The \"appears in place\" rule applies to Menu, Select and Combobox, which clear their highlight.",
        "Keys move the selection and the plate at once. Off on touch, under reduced motion and in forced colours, as for the other popups.",
      ],
      tryIt: ["Move the pointer over the rows and leave the list: the plate stays on the last row.", "Type to filter, then use the arrow keys."],
      states: ["open", "open-glide", "open-forced-colours-lit", "open-reduced-motion-lit"],
      demo: ({ state }) => <CommandDemo state={state} />,
    },
    {
      id: "callout",
      name: "The callout icon in forced colours",
      intro: "A fix, not a design: an SVG keeps its own authored colour in forced colours, so a callout's green, amber or red icon stayed coloured.",
      decisions: [
        "Engineering fix inside the agreed design: in forced colours the status icon takes the system foreground (CanvasText), like the text beside it. The status is the icon's shape and the words. A test fails without it.",
        "Not changed: the callouts' colour treatment goes back to the council.",
      ],
      tryIt: ["Turn on forced colours: all four icons are the system text colour."],
      states: ["forced-colours"],
      demo: () => <CalloutDemo />,
    },
  ],
};
