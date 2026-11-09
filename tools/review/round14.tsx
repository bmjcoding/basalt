// Round 14: the core icon set, built as the council drew it and the owner approved it (DECISIONS items 38 to 40, 54 and
// 55): a glyph per module, rest and selected from one drawing, the allow-listed morphs with a morph in flight keeping
// its identity, the long tail in Phosphor Bold, and XCircle for danger. Nothing here is an option.
//
// The drawing is the council's: it is generated from the drawn set (packages/react/glyphs/source.mjs) and tests compare
// every glyph with it. The implementation (the renderer, the morph controller, the Icon and MorphIcon changes) has not
// been reviewed by the design panel.
//
// Forced colours and reduced motion are states of the first step: the screenshot build emulates each on the page.

import {
  FunnelIcon,
  GitBranchIcon,
  KeyIcon,
  LockIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import * as React from "react";

import { Button, Callout, Icon, IconButton, MorphIcon, Text } from "../../packages/react/src/index";
import * as CoreSet from "../../packages/react/src/glyph-set";
import type { GlyphIcon } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const camel = (name: string) => name.split("-").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
const glyphOf = (name: string) => (CoreSet as unknown as Record<string, GlyphIcon>)[`${camel(name)}Glyph`]!;

const ACTIONS = ["menu", "plus", "close", "minus", "check", "more", "arrow-right", "arrow-down", "arrow-left", "arrow-up", "chevron-right", "chevron-down", "chevron-left", "chevron-up", "external", "play", "pause", "download", "copy", "edit", "trash"] as const;
const NAVIGATION = ["home", "search", "notifications", "messages", "profile", "settings", "more-nav", "calendar", "trends", "plan", "sources", "history"] as const;
const BLACKSAND = ["runs", "sandboxes", "routes", "policy", "records"] as const;
type ActionName = (typeof ACTIONS)[number];

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- 1. The set

const SIZES = [16, 20, 24] as const;
const cells: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(88px, 1fr) repeat(3, 28px) 8px repeat(3, 28px)", alignItems: "center", gap: 6, padding: "6px 0", color: "var(--basalt-text-primary)" };
const nameStyle: React.CSSProperties = { font: "var(--basalt-font-weight-regular) var(--basalt-text-xs-size)/1 var(--basalt-font-family-mono)", color: "var(--basalt-text-secondary)", overflow: "hidden", textOverflow: "ellipsis" };
const cellStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" };

function SetGroup({ title, names }: { title: string; names: readonly string[] }) {
  return (
    <div style={{ width: "100%" }}>
      <Caption>{title}: rest at 16, 20, 24, then selected at 16, 20, 24</Caption>
      {names.map((name) => (
        <div key={name} style={cells} data-glyph-row={name}>
          <span style={nameStyle}>{name}</span>
          {SIZES.map((size) => <span key={`r${size}`} style={cellStyle}><Icon icon={glyphOf(name)} size={size} /></span>)}
          <span />
          {SIZES.map((size) => <span key={`s${size}`} style={cellStyle}><Icon icon={glyphOf(name)} size={size} selected /></span>)}
        </div>
      ))}
    </div>
  );
}

function SetDemo() {
  return (
    <div style={col}>
      <SetGroup title="Actions" names={ACTIONS} />
      <SetGroup title="Navigation" names={NAVIGATION} />
      <SetGroup title="Blacksand" names={BLACKSAND} />
    </div>
  );
}

// ---- 2. The morphs, live

function Pair({ a, b, label }: { a: ActionName; b: ActionName; label: string }) {
  const [on, setOn] = React.useState(false);
  return (
    <Button onClick={() => setOn((v) => !v)}>
      <MorphIcon glyph={glyphOf(on ? b : a)} />
      {label}
    </Button>
  );
}

function Cycle({ names, label }: { names: readonly ActionName[]; label: string }) {
  const [i, setI] = React.useState(0);
  return (
    <Button onClick={() => setI((v) => (v + 1) % names.length)}>
      <MorphIcon glyph={glyphOf(names[i]!)} />
      {label}
    </Button>
  );
}

function SelectRow() {
  const [on, setOn] = React.useState(false);
  const names = [...NAVIGATION.slice(0, 6), ...BLACKSAND];
  return (
    <div style={col}>
      <div style={{ ...row, gap: 20, color: "var(--basalt-text-primary)" }}>
        {names.map((name) => <MorphIcon key={name} glyph={glyphOf(name)} selected={on} size={24} />)}
      </div>
      <Button onClick={() => setOn((v) => !v)}>{on ? "Back to rest" : "Select them"}</Button>
    </div>
  );
}

function NotAllowed() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(true);
  return (
    <div style={row}>
      <Button onClick={() => setA((v) => !v)}><MorphIcon glyph={a ? CoreSet.MinusGlyph : CoreSet.CheckGlyph} />Minus, check</Button>
      <Button onClick={() => setB((v) => !v)}><MorphIcon glyph={b ? CoreSet.HomeGlyph : CoreSet.SearchGlyph} />Home, search</Button>
    </div>
  );
}

function MorphDemo() {
  return (
    <div style={col}>
      <Caption>Rotation groups: click to turn (click twice quickly: it turns on, or back, from where it is)</Caption>
      <div style={row}>
        <Cycle names={["arrow-right", "arrow-down", "arrow-left", "arrow-up"]} label="Arrows" />
        <Cycle names={["chevron-right", "chevron-down", "chevron-left", "chevron-up"]} label="Chevrons" />
        <Pair a="plus" b="close" label="Plus, close" />
      </div>
      <Caption>The four drawn pairs, both ways</Caption>
      <div style={row}>
        <Pair a="menu" b="close" label="Menu, close" />
        <Pair a="play" b="pause" label="Play, pause" />
        <Pair a="copy" b="check" label="Copy, check" />
        <Pair a="chevron-down" b="download" label="Chevron, download" />
      </div>
      <Caption>Rest and selected: the opening closes into the fill</Caption>
      <SelectRow />
      <Caption>Not allowed, so they swap at once (no neighbour morphs)</Caption>
      <NotAllowed />
    </div>
  );
}

// ---- 3. A toolbar, and navigation

function ToolbarDemo() {
  const [selected, setSelected] = React.useState("home");
  const items = [
    { name: "home", label: "Home" },
    { name: "search", label: "Search" },
    { name: "notifications", label: "Notifications" },
    { name: "runs", label: "Runs" },
    { name: "sandboxes", label: "Sandboxes" },
  ] as const;
  return (
    <div style={col}>
      <Caption>A toolbar mixing core glyphs (copy, edit, download) and Phosphor Bold (branch, terminal, funnel, lock, key)</Caption>
      {([20, 24] as const).map((size) => (
        <div key={size} style={{ ...row, gap: 16, color: "var(--basalt-text-secondary)" }} data-toolbar={size}>
          <Icon icon={CoreSet.CopyGlyph} size={size} />
          <Icon icon={CoreSet.EditGlyph} size={size} />
          <Icon icon={CoreSet.DownloadGlyph} size={size} />
          <Icon icon={GitBranchIcon} size={size} />
          <Icon icon={TerminalWindowIcon} size={size} />
          <Icon icon={FunnelIcon} size={size} />
          <Icon icon={LockIcon} size={size} />
          <Icon icon={KeyIcon} size={size} />
        </div>
      ))}
      <div style={row}>
        <IconButton icon={CoreSet.CopyGlyph} label="Copy" variant="secondary" />
        <IconButton icon={CoreSet.TrashGlyph} label="Delete" variant="secondary" />
        <IconButton icon={LockIcon} label="Lock" variant="secondary" />
        <IconButton icon={KeyIcon} label="Keys" variant="secondary" />
      </div>
      <Caption>Navigation: glyphs are primary at rest, like their labels; selected is the filled glyph and a bold label (the row itself is the navigation component's round)</Caption>
      <nav aria-label="Example navigation" style={{ display: "flex", flexDirection: "column", gap: 4, color: "var(--basalt-text-primary)" }}>
        {items.map((item) => (
          <button
            key={item.name}
            type="button"
            aria-current={selected === item.name ? "page" : undefined}
            onClick={() => setSelected(item.name)}
            style={{ display: "flex", alignItems: "center", gap: 16, minHeight: 44, padding: "0 12px", border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: `${selected === item.name ? "var(--basalt-font-weight-semibold)" : "var(--basalt-font-weight-regular)"} var(--basalt-text-base-size)/1 var(--basalt-font-family-sans)` }}
          >
            <MorphIcon glyph={glyphOf(item.name)} selected={selected === item.name} size={24} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---- 4. Danger

function DangerDemo() {
  return (
    <div style={col}>
      <Caption>Danger is the XCircle, with the words</Caption>
      <Callout status="danger" title="Route refused: api.example.com">This run isn't allowed to reach that host. Add it to the run's routes to allow it.</Callout>
      <Callout status="warning" title="The tools image isn't pinned" />
      <Callout status="success" title="Sandbox ready" />
      <Callout title="Records are kept for 30 days" />
      <div style={row}>
        <Button variant="danger">Delete sandbox</Button>
        <Text tone="secondary" size="sm">The danger Callout is the only place Basalt draws an error icon today; it is the circle with a cross.</Text>
      </div>
    </div>
  );
}

export const ROUND_14: Round = {
  id: "14",
  title: "The core icon set",
  reviewed: false,
  summary:
    "Basalt's own icon set, built as the council drew it and the owner approved it (decisions 38 to 40, 54 and 55): one module per glyph, rest and selected from one drawing, the allow-listed morphs, the long tail in Phosphor Bold at 16, 20 and 24, and XCircle for danger. The drawing is the council's; the design panel has not reviewed this implementation.",
  steps: [
    {
      id: "set",
      name: "The set",
      intro: "Thirty-eight glyphs at rest and selected, at 16, 20 and 24. The stroke is 2.25 units on the 24 grid at every size; selected closes the opening and fills.",
      decisions: [
        "The drawing is the council's, generated from the drawn set; a test compares every glyph, at rest and selected at 16, 20 and 24, with it.",
        "Actions are exactly three straight lines (copy, edit, trash and download are the agreed exceptions). The arrow group is centred and MorphIcon's arrow is the same data as the static one.",
        "Fourteen glyphs have one opening at the object's own joint; profile, sources and history have none. Selected fills closed loops and cuts inner strokes out as holes.",
        "Open for the owner: nothing visual was left open. Close is still small and the bell's opening faint at 16 (the council noted both, not blocking).",
      ],
      tryIt: ["Compare each glyph at 16 against 24.", "Look at the selected column: openings are closed, loops filled, details cut out.", "States: forced colours and reduced motion are shot as well."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <SetDemo />,
    },
    {
      id: "morphs",
      name: "The morphs",
      intro: "Only rest and selected, a rotation group, and the four drawn pairs morph. Everything else swaps at once.",
      decisions: [
        "A morph in flight keeps its identity: asking for where it is going does nothing, asking for where it came from runs it back, asking for another member of its group turns on. Anything else swaps at once, mid-rotation too.",
        "Pairs run both ways (decision 54). Motion uses the slow duration and ease-out tokens; reduced motion swaps at once.",
        "The council's 11 checks, and Opus's extra sequences, run in the test suite against this MorphIcon.",
      ],
      tryIt: ["Click the arrows quickly: they turn on, or back, from where they are.", "Click Menu, close twice quickly.", "Select the navigation glyphs; then try Minus, check, which swaps at once."],
      states: ["reduced-motion", "forced-colours"],
      demo: () => <MorphDemo />,
    },
    {
      id: "context",
      name: "Toolbar and navigation",
      intro: "Core glyphs beside Phosphor Bold, at 20 and 24, and a navigation list with glyphs primary at rest.",
      decisions: [
        "The long tail is Phosphor Bold at 16, 20 and 24, which draws the core's stroke (decision 39d).",
        "Navigation glyphs in a sidebar or rail are primary at rest; toolbars keep secondary (decision 39e, approved with this set).",
        "Phosphor Fill only on a selected glyph marked fillSafe; the core glyphs have their own selected drawing.",
      ],
      tryIt: ["Compare the weight of the Phosphor glyphs with the core ones in each toolbar.", "Click through the navigation rows."],
      states: ["forced-colours"],
      demo: () => <ToolbarDemo />,
    },
    {
      id: "danger",
      name: "Danger",
      intro: "Danger is the XCircle everywhere, in text and a circle with a cross, never colour alone.",
      decisions: ["Callout's danger icon is now XCircle where it was WarningCircle (decision 38, 3 to 0)."],
      tryIt: ["Compare the four Callouts: each status has its own shape."],
      states: ["forced-colours"],
      demo: () => <DangerDemo />,
    },
  ],
};
