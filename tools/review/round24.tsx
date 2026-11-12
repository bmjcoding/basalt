// Round 24: in-page commands, list plus preview, two-line rows and the follow-ups. The council voted (decision 103, finish-nov10 batch 5: a
// three-member round, 2 of 3 deciding; the votes are in .review/council/commands-vote/) and handed the build over. This is that design
// built as decided. The design panel has not reviewed this implementation. The data is made up.
//
// "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads, and a state that ends in one of them
// takes it. The "cmd-*" states drive a real keyboard, pointer or finger on the list: cmd-focus (the field focused, one arrow down),
// cmd-filter, cmd-empty, cmd-pick (a press on the second row of the split), cmd-push (↵ in the pushed list). The "t2-*" states open the
// checklist, and the "centre-*" states the notification centre. Every step is shot at 1440 and 390, at 1x and 2x, in both themes.

import * as React from "react";
import {
  CopyIcon,
  GearIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";

import {
  Button,
  CommandList,
  CommandMenu,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  MultiSelect,
  NotificationCentre,
  Select,
} from "../../packages/react/src/index";
import type { Command as CommandItem, CommandGroup } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 1104 };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// Synthetic commands: two-line and one-line rows mixed, a key chip, a danger row and one long description.
const COMMANDS: CommandGroup[] = [
  {
    label: "Sandbox",
    commands: [
      { id: "new", label: "New sandbox", icon: PlusIcon, description: "Create a fresh environment from a template", shortcut: "⌘N", onSelect: () => {} },
      { id: "dup", label: "Duplicate", icon: CopyIcon, description: "Copy the current one, with its settings", onSelect: () => {} },
      { id: "rename", label: "Rename", onSelect: () => {} },
      { id: "del", label: "Delete sandbox", icon: TrashIcon, danger: true, description: "Remove it and its routes for good", onSelect: () => {} },
    ],
  },
  {
    label: "Account",
    commands: [
      { id: "keys", label: "API keys", icon: KeyIcon, description: "Create and revoke the keys your agents use to reach this account and its sandboxes", onSelect: () => {} },
      { id: "team", label: "Invite a teammate", icon: UsersIcon, onSelect: () => {} },
      { id: "settings", label: "Settings", icon: GearIcon, description: "Billing, members and defaults", onSelect: () => {} },
      { id: "audit", label: "Audit log", description: "Who changed what, and when", onSelect: () => {} },
      { id: "hooks", label: "Webhooks", onSelect: () => {} },
    ],
  },
];

// ---- 1. the command list in the page

function ListDemo() {
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      <Caption>The command panel set in the page: a level-1 panel with its rim, no scrim or shadow. The field takes the −2 inset ring when focused; the plate shows only while the list is in use.</Caption>
      <CommandList label="Console" groups={COMMANDS} />
      <p style={{ margin: 0, color: "var(--basalt-text-secondary)", fontSize: 13 }}>Below the list: it never moves when you filter.</p>
    </div>
  );
}

// ---- 2. list plus preview

const DETAILS: Record<string, { summary: string; facts: [string, string][] }> = {
  new: { summary: "Start from a template and have a running sandbox in under a minute.", facts: [["Template", "Node 22"], ["Region", "eu-west"], ["Size", "2 vCPU, 4 GB"]] },
  dup: { summary: "Copies the files, the settings and the routes. Secrets are not copied.", facts: [["Copies", "Files, settings, routes"], ["Skips", "Secrets"], ["Takes", "About 20 seconds"]] },
  rename: { summary: "A rename never changes a sandbox's address.", facts: [["Address", "blacksand-api"], ["Last renamed", "3 weeks ago"]] },
  del: { summary: "Removes the sandbox and its routes. This can't be undone.", facts: [["Routes", "4"], ["Disk", "1.2 GB"], ["Last run", "yesterday"]] },
};

function Detail({ command }: { command: CommandItem }) {
  const detail = DETAILS[command.id] ?? { summary: command.description ?? "Open it to see more.", facts: [["Section", "Account"], ["Who can", "Owners"]] };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ margin: 0, fontSize: "var(--basalt-text-xl-size)", lineHeight: "var(--basalt-text-xl-line-height)", fontWeight: 600 }}>{command.label}</h3>
      <p style={{ margin: 0, color: "var(--basalt-text-secondary)", maxWidth: "60ch" }}>{detail.summary}</p>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 24, rowGap: 8, fontSize: 14 }}>
        {detail.facts.map(([term, value]) => (
          <React.Fragment key={term}>
            <dt style={{ color: "var(--basalt-text-secondary)" }}>{term}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="primary">{command.danger ? "Delete…" : "Open"}</Button>
        <Button>Copy link</Button>
      </div>
    </div>
  );
}

function SplitDemo() {
  return (
    <div style={col}>
      <Caption>Full width (a 1104px container at 1440): side by side, the list a fixed 320px and the pane the rest, 16px apart. Under 816px of its own width it is a push.</Caption>
      <div data-wt-split="" style={{ width: "100%" }}>
        <CommandList label="Console" groups={COMMANDS} detail={(command) => <Detail command={command} />} />
      </div>
      <Caption>The same list in a 760px container: pushed, with a chevron at each row's end. ↵ or a tap opens the detail, with a Back band at its top.</Caption>
      <div data-wt-push="" style={{ width: "100%", maxWidth: 760 }}>
        <CommandList label="Console" groups={COMMANDS} detail={(command) => <Detail command={command} />} />
      </div>
    </div>
  );
}

// ---- 3. two-line rows

/** Compact density is set where portalled popups see it: on the document. */
function useDensity(compact: boolean) {
  React.useEffect(() => {
    document.documentElement.dataset.density = compact ? "compact" : "default";
    return () => { document.documentElement.dataset.density = "default"; };
  }, [compact]);
}

const OPTIONS = [
  { value: "private", label: "Private", description: "Only you can see it" },
  { value: "team", label: "Team", description: "Everyone in the workspace" },
  { value: "link", label: "Anyone with the link" },
  { value: "public", label: "Public", description: "Listed, and found by search engines and by anyone on the open internet" },
];

function RowsDemo({ state }: { state: string }) {
  const compact = state.includes("compact");
  useDensity(compact);
  const kind = state.replace(/-(forced-colours|reduced-motion)$/, "").replace(/-(lit|compact)/g, "");
  const [visibility, setVisibility] = React.useState("team");
  const open = kind === "menu" || kind === "select" || kind === "command";
  return (
    <div style={{ ...col, minHeight: open ? 520 : undefined }}>
      <Caption>{open ? `${kind === "command" ? "The command menu" : kind === "menu" ? "A menu" : "A select"}, one-line and two-line rows mixed${compact ? ", compact" : ""}.` : "The command list's rows, default and compact: a two-line row is the one-line plate plus 18px (16 compact), and the lines touch."}</Caption>
      {open ? (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {kind === "menu" ? (
            <Menu defaultOpen modal={false}>
              <MenuTrigger>Visibility</MenuTrigger>
              <MenuContent>
                <MenuRadioGroup value={visibility} onValueChange={setVisibility}>
                  <MenuRadioItem value="private" description="Only you can see it">Private</MenuRadioItem>
                  <MenuRadioItem value="team" description="Everyone in the workspace">Team</MenuRadioItem>
                  <MenuRadioItem value="public" description="Listed, and found by search engines and by anyone on the open internet">Public</MenuRadioItem>
                </MenuRadioGroup>
                <MenuSeparator />
                <MenuCheckboxItem defaultChecked>Show in search</MenuCheckboxItem>
                <MenuItem icon={CopyIcon} shortcut="⌘L">Copy link</MenuItem>
                <MenuItem danger icon={TrashIcon} description="Remove it and its routes for good">Delete</MenuItem>
              </MenuContent>
            </Menu>
          ) : null}
          {kind === "select" ? <div style={{ width: 240 }}><Select defaultOpen modal={false} aria-label="Visibility" options={OPTIONS} defaultValue="team" /></div> : null}
          {kind === "command" ? <CommandMenu open onOpenChange={() => {}} groups={COMMANDS} /> : null}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "start" }}>
          <div>
            <Caption>Default</Caption>
            <CommandList label="Default" groups={[COMMANDS[0]!]} />
          </div>
          <div data-density="compact">
            <Caption>Compact</Caption>
            <CommandList label="Compact" groups={[COMMANDS[0]!]} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 4. Clear after the count

const STATUS = [
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
  { value: "stopped", label: "Stopped" },
];

function ClearDemo() {
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      <Caption>Clear sits right after the count, 8px away. The count reserves its widest form ("Any" or "N of N"), so Clear is at the same x in all three.</Caption>
      {[[], ["running", "queued"], ["running", "queued", "failed", "stopped"]].map((value, i) => (
        <MultiSelect key={i} label="Status" options={STATUS} defaultValue={value} />
      ))}
    </div>
  );
}

// ---- 5. the checklist with search

const SERVICES = ["Billing", "Ingest", "Router", "Gateway", "Queue", "Search", "Storage", "Scheduler", "Cache", "Auth", "Mailer", "Metrics", "Notifier", "Exporter"]
  .map((label) => ({ value: label.toLowerCase(), label }));

function ChecklistDemo() {
  return (
    <div style={{ ...col, maxWidth: 520, minHeight: 640 }}>
      <Caption>Fourteen values: from ten the checklist has a search band. Its rows scroll inside 360px, nine whole and the tenth the first to go, with the band and the foot outside.</Caption>
      <div><MultiSelect label="Service" options={SERVICES} defaultValue={["billing", "ingest", "router", "gateway", "queue", "search", "storage", "scheduler", "cache", "auth"]} /></div>
    </div>
  );
}

// ---- 6. the notification centre's glide

const ENTRIES = [
  { id: "1", title: "Deploy finished", description: "blacksand-api, production", time: "2m ago", status: "success" as const, unread: true },
  { id: "2", title: "Build queued", time: "9m ago" },
  { id: "3", title: "Disk nearly full", description: "volume-a is at 92%", time: "1h ago", status: "warning" as const, unread: true },
  { id: "4", title: "Backup finished", time: "Yesterday" },
  { id: "5", title: "Key rotated", description: "agent-tools, 3 sandboxes updated", time: "Sun", status: "success" as const },
];

function CentreDemo({ state }: { state: string }) {
  const open = state !== "default";
  React.useEffect(() => {
    if (!state.startsWith("centre-keys")) return undefined;
    const timer = window.setTimeout(() => document.querySelectorAll<HTMLElement>(".basalt-notification")[1]?.focus(), 400);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div style={{ ...col, minHeight: open ? 560 : undefined }}>
      <Caption>{open ? "Entries of two lines and one: the plate follows the pointer between them and changes height as it goes; the first key hides it and the focused entry shows the ring at +2." : "Closed. Open it and move the pointer down the entries."}</Caption>
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
        <NotificationCentre entries={ENTRIES} defaultOpen={open} />
      </div>
    </div>
  );
}

const PAGE_STATES = ["cmd-focus", "cmd-filter", "cmd-empty", "reduced-motion", "forced-colours", "cmd-focus-forced-colours", "cmd-focus-reduced-motion"];

export const ROUND_24: Round = {
  id: "24",
  title: "In-page commands, two-line rows and the follow-ups",
  reviewed: false,
  summary:
    "The council voted (decision 103, a three-member round, 2 of 3 deciding; Muse was out) and handed the build over. The command panel set in the page (CommandList), with a list-plus-preview pattern and its push under 816px, a description on every popup row, Clear after the count in the chips' head, a search band in the checklist from ten values, and the notification centre joining the hover glide. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "command-list",
      name: "The command list in the page",
      intro: "The command panel without the dialog: a level-1 panel in the flow, a field that keeps focus while the arrows move through the rows, and a foot that counts what is shown.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0 (decision 103): the plate shows only while the field has focus or the pointer is over the list, and stays when the pointer leaves while the field has focus. The list holds its unfiltered height, up to size-popup-max-height, and scrolls inside, so filtering moves nothing below it.",
        "Decided 3 to 0: a foot band shows the count at the start (\"9 commands\", \"3 of 9\") and the key legend at the end (hidden on touch). The count is spoken once, after 400ms of stillness. No match is one centred sentence and a ghost \"Clear search\", outside the listbox.",
        "Decided 3 to 0: one command surface per page owns ⌘K. A page with a modal gives it to the modal; a page whose surface is the list binds it (bindShortcut): focus the field, select its text, scroll it into view.",
        "Built as the prototype drew it: the field takes the flush-field −2 ring in the page (the modal's stays ringless); Esc clears the query and does nothing when it is empty; no autofocus on load.",
      ],
      tryIt: ["Tab to the field, then use ↑ and ↓: they wrap, and the plate snaps.", "Type \"sand\", then \"zzz\": the list's height never changes.", "Move the pointer over the list and away: the plate comes and goes with focus and pointer."],
      states: PAGE_STATES,
      demo: () => <ListDemo />,
    },
    {
      id: "list-preview",
      name: "List plus preview",
      intro: "A pattern on the list: the active command's detail in a pane beside it, or pushed over it on a narrow container.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: two level-1 panels space-4 apart, the list a fixed size-list-width (320px, a new token), the pane the rest, with no line between. It answers its own width, not the viewport's.",
        "Decided 2 to 1 on the number: the split is from 816px (320 + 16 + 480), not 800. At 800 the gap leaves the pane 464px, under its narrow form. The container query writes 816 and its comment names all three tokens.",
        "Decided 3 to 0: hover lifts a row's ink only; the plate, which marks what the pane shows, moves by ↑ ↓ or a press. Decided 2 to 1: ↵ in a split runs the pane's first button.",
        "Decided 3 to 0: the push. Focus moves to the detail's heading; Back keeps the query, the scroll and the active row and returns focus to the field with a hardware keyboard, or to the list's region on touch. The detail enters 8px along the reading direction with a fade over duration-slow.",
        "Not copied from the prototypes: Opus's split began at 800 (the pane 464px).",
      ],
      tryIt: ["Hover rows in the split: nothing moves but the ink. Press one, or use the arrows: the plate and the pane move together.", "Press ↵ with the field focused in the split: the pane's first button runs.", "In the 760px list, press ↵ on a row, then Back."],
      states: ["cmd-pick@1440", "cmd-push", "cmd-push-reduced-motion", "forced-colours"],
      demo: () => <SplitDemo />,
    },
    {
      id: "two-line-rows",
      name: "Two-line rows",
      intro: "A description under the title, on every popup row: the one-line plate plus 18px, the lines touching, both truncating.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Decided 3 to 0: the description runs from the text's edge to the row's end, under the chip's column too. A described menu is as wide as its content up to size-popover-max, then descriptions truncate. Menu and Select describe a choice only when the label can't tell choices apart.",
        "Decided 3 to 0: the plate is the one-line plate plus text-sm's line height (command 58 in a 62 row; menu 54 in 58; compact 52/56 and 48/52), the title 14/20 at 400 and the description 13/18 at 400 (12/16 compact), tertiary at rest and secondary when lit, with no weight change.",
        "Not copied from the prototypes: Grok spaced the two lines 10 to 12px apart, so its description ran past the plate. Here the line boxes touch.",
      ],
      tryIt: ["Open the menu and the select: rows of one and two lines share a list, each its own height.", "Switch to compact (the compact states): the plates step down 4 and 4."],
      states: ["menu", "menu-lit", "menu-compact-lit", "select", "select-lit", "command", "command-lit", "menu-forced-colours-lit", "menu-reduced-motion"],
      demo: ({ state }) => <RowsDemo state={state} />,
    },
    {
      id: "clear-after-count",
      name: "Clear after the count",
      intro: "In the chips' head, Clear sits right after the count, and the count reserves its widest form so Clear never moves.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: the order is \"Status · 2 of 4 · Clear\", space-2 apart. The count reserves the width of \"Any\" and \"N of N\" in one grid cell with tabular figures. The checklist's footer stays as shipped.",
      ],
      tryIt: ["Toggle chips: Clear stays at one x from \"Any\" to \"4 of 4\"."],
      states: ["forced-colours"],
      demo: () => <ClearDemo />,
    },
    {
      id: "checklist-search",
      name: "The checklist's search band",
      intro: "From ten values the checklist opens on a search band, and its rows scroll inside 360px.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Decided 2 to 1 (Sol wanted it from eight, a 48px band): from ten values, when the 360px rows start to scroll; a 40px band (size-control-xl), 14/20 (16 on touch), the next level's fill, a divider below, the −2 inset ring.",
        "Built, not voted: the shipped checklist had no 360px cap, so the rows now scroll inside it, with the band and the foot outside. On touch the checklist opens without focusing the band (Opus's prototype focused it).",
      ],
      tryIt: ["Open it: the band has focus with a keyboard. ↓ goes to the first row, ↑ from it comes back; type on a row and it goes to the band.", "Press Esc with text in the band: the text clears first."],
      states: ["t2-open", "t2-filter", "t2-empty", "t2-open-forced-colours", "t2-open-reduced-motion"],
      demo: () => <ChecklistDemo />,
    },
    {
      id: "centre-travel",
      name: "The notification centre's glide",
      intro: "Navigation's hover glide, in the centre: one plate follows the pointer between entries of two lines and one.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Decided 3 to 0: the centre joins the glide on navigation's rules. The first key hides the plate and the resting hover, and the focused entry shows the shipped rounded control ring at +2. Off on touch, under reduced motion and in forced colours. The mark's seat stays, as shipped.",
        "Not copied from the prototypes: both drew the focused entry's ring square or at 0px offset. It is the shipped rounded ring at +2, outside the row.",
      ],
      tryIt: ["Move the pointer down the entries: the plate glides and changes height.", "Press Tab: the plate and the resting hover go, and the ring shows."],
      states: ["centre-open", "centre-travel", "centre-keys", "centre-open-forced-colours", "centre-open-reduced-motion"],
      demo: ({ state }) => <CentreDemo state={state} />,
    },
  ],
};
