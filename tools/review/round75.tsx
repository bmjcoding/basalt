// Round 75: cimip-gaps-3 topic t6, built from the council's decision (DECISIONS 385: the owner's handoff, "full send"): find, keys, code, glyphs and content.
// CommandMenu's foot, count and empty slot; the app's match marks and a row that cannot run (in the modal and the list); the menu rows for the loop hold and
// single keys and MenuText; the send and keyboard glyphs; Nav md's label at 18/26; CodeBlock's line numbers and its sideways line; RichText. Built by Opus;
// the implementation has not been reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Three changes are for the owner's eye, each before and after: the navigation label, the foot every CommandMenu gains, and send as a fifth richer action.
// Each "today" side is this build with the change taken back, scoped to that side (or, for the modal, which portals, to that state's page).

import { KeyboardIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  CodeBlock,
  CommandList,
  CommandMenu,
  Icon,
  LoopsToggleMenuItem,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuText,
  MenuTrigger,
  Nav,
  NavItem,
  Prose,
  RichText,
  SingleKeysMenuItem,
} from "../../packages/react/src/index";
import * as CoreSet from "../../packages/react/src/glyph-set";
import type { Command, CommandGroup, GlyphIcon } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const PAIR = ".r75-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r75-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
const NOT_REVIEWED = "Built from the council's t6 decision (DECISIONS 385); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";

// ---- Two unlike domains: a recipe box and a build server ----

const RECIPES: CommandGroup[] = [
  { label: "Recipes", commands: [
    { id: "soup", label: "Tomato soup", icon: CoreSet.SearchGlyph, description: "Ready in 30 minutes", onSelect: () => {} },
    { id: "share", label: "Share recipe", icon: CoreSet.SendGlyph, unavailable: "Sign in to share a recipe with another cook.", shortcut: "Mod+S", onSelect: () => {} },
    { id: "pie", label: "Apple pie", description: "Bake for 45 minutes", onSelect: () => {} },
    { id: "bread", label: "Plain bread", shortcut: "Mod+B", onSelect: () => {} },
  ] },
  { label: "Pantry", commands: [
    { id: "list", label: "Shopping list", onSelect: () => {} },
    { id: "clear", label: "Clear the pantry", danger: true, onSelect: () => {} },
    { id: "units", label: "Units and measures", onSelect: () => {} },
  ] },
];

// The app ranked these for "sha" and says what matched.
const MATCHED: CommandGroup[] = [
  { label: "Results", commands: [
    { id: "share", label: "Share recipe", icon: CoreSet.SendGlyph, unavailable: "Sign in to share a recipe with another cook.", matches: { label: [[0, 3]], unavailable: [[11, 14]] }, onSelect: () => {} },
    { id: "shallot", label: "Shallot tart", description: "Shallots, butter and thyme", matches: { label: [[0, 3]], description: [[0, 3]] }, onSelect: () => {} },
    { id: "wash", label: "Wash the shared bowls", danger: true, matches: { label: [[9, 12]] }, onSelect: () => {} },
  ] },
];

const BUILDS: CommandGroup[] = [
  { label: "Builds", commands: [
    { id: "deploy", label: "Deploy main", icon: CoreSet.SendGlyph, unavailable: "The last build failed, so there is nothing to deploy until a build passes.", onSelect: () => {} },
    { id: "retry", label: "Retry build #212", description: "Runs every check again", onSelect: () => {} },
    { id: "logs", label: "Open logs", onSelect: () => {} },
    { id: "cancel", label: "Cancel queued builds", danger: true, onSelect: () => {} },
  ] },
];

const Pane = (command: Command) => (
  <div>
    <h3 style={{ margin: "0 0 var(--basalt-space-2)", font: "var(--basalt-font-weight-semibold) var(--basalt-text-md-size) / var(--basalt-text-md-line-height) var(--basalt-font-family-sans)" }}>{command.label}</h3>
    <p style={{ margin: "0 0 var(--basalt-space-4)", color: "var(--basalt-text-secondary)", fontSize: "var(--basalt-text-sm-size)" }}>{command.description ?? "From the build server."}</p>
    <Button size="sm">Run it</Button>
  </div>
);

// ---- 1. The modal's foot, count and empty slot ----

const TODAY_FOOT = ".basalt-dialog .basalt-command-foot { display: none !important; }";

function MenuFoot({ state }: { state: string }) {
  const before = state.startsWith("before");
  const empty = state.endsWith("empty");
  const [search, setSearch] = React.useState(state === "filtering" ? "pie" : empty ? "zzq" : "");
  return (
    <>
      {before ? <style>{TODAY_FOOT}</style> : null}
      <p style={label}>{before ? "Today (main): no foot, and \"No commands match.\" when nothing is shown" : "This build: the foot counts what is shown; with nothing shown, the empty block"}</p>
      <CommandMenu
        open
        onOpenChange={() => {}}
        groups={RECIPES}
        noun="recipe"
        hints={!before}
        search={search}
        onSearchChange={setSearch}
        empty={before ? "No commands match." : undefined}
      />
    </>
  );
}

// ---- 2. Matched words and a row that cannot run, in the modal ----

// The same rows with the unavailable one first, so it is the lit row.
const SHARE_FIRST: CommandGroup[] = [{ ...RECIPES[0]!, commands: [RECIPES[0]!.commands[1]!, RECIPES[0]!.commands[0]!, ...RECIPES[0]!.commands.slice(2)] }, RECIPES[1]!];

function Unavailable({ state }: { state: string }) {
  const [search, setSearch] = React.useState(state.startsWith("marks") ? "sha" : "");
  const groups = state.startsWith("marks") ? MATCHED : state === "lit" ? SHARE_FIRST : RECIPES;
  return <CommandMenu open onOpenChange={() => {}} groups={groups} filter={state.startsWith("marks") ? false : undefined} search={search} onSearchChange={setSearch} noun="recipe" />;
}

// ---- 3. In the list, beside a preview and pushed ----

function ListUnavailable() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
      <CommandList label="Builds" groups={BUILDS} noun="build" detail={Pane} reserve={false} />
      <CommandList label="Builds, no preview" groups={BUILDS} noun="build" reserve={false} empty={({ search, clear }) => <><p>No build is called “{search}”.</p><Button size="sm" variant="ghost" onClick={clear}>Show every build</Button></>} />
    </div>
  );
}

// ---- 4. The menu rows and MenuText ----

function MenuRows() {
  return (
    <div style={{ display: "flex", gap: "var(--basalt-space-6)", flexWrap: "wrap", minHeight: 420 }}>
      <Menu defaultOpen modal={false}>
        <MenuTrigger render={<Button variant="secondary">View</Button>} />
        <MenuContent>
          <MenuGroup>
            <MenuGroupLabel>Order</MenuGroupLabel>
            <MenuText>Pinned recipes stay at the top whatever the order.</MenuText>
            <MenuRadioGroup defaultValue="new">
              <MenuRadioItem value="new">Newest first</MenuRadioItem>
              <MenuRadioItem value="old">Oldest first</MenuRadioItem>
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator />
          <LoopsToggleMenuItem />
          <SingleKeysMenuItem />
          <MenuSeparator />
          <MenuItem>Print the recipe box</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function BuildMenu() {
  return (
    <div style={{ minHeight: 300 }}>
      <Menu defaultOpen modal={false}>
        <MenuTrigger render={<Button variant="secondary">Build options</Button>} />
        <MenuContent>
          <MenuText>Builds on main always run every check.</MenuText>
          <LoopsToggleMenuItem description={false} />
          <MenuItem>Copy the build link</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

// ---- 5. The glyphs ----

const camel = (name: string) => name.split("-").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
const glyphOf = (name: string) => (CoreSet as unknown as Record<string, GlyphIcon>)[`${camel(name)}Glyph`]!;
const SIZES = [16, 20, 24] as const;
const cells: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(88px, 1fr) repeat(3, 28px) 8px repeat(3, 28px)", alignItems: "center", gap: 6, padding: "6px 0", color: "var(--basalt-text-primary)" };
const nameStyle: React.CSSProperties = { font: "var(--basalt-font-weight-regular) var(--basalt-text-xs-size)/1 var(--basalt-font-family-mono)", color: "var(--basalt-text-secondary)" };
const cellStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" };

function Sheet({ title, names }: { title: string; names: readonly string[] }) {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <p style={label}>{title}: rest at 16, 20, 24, then selected at 16, 20, 24</p>
      {names.map((name) => (
        <div key={name} style={cells}>
          <span style={nameStyle}>{name}</span>
          {SIZES.map((size) => <span key={`r${size}`} style={cellStyle}><Icon icon={glyphOf(name)} size={size} /></span>)}
          <span />
          {SIZES.map((size) => <span key={`s${size}`} style={cellStyle}><Icon icon={glyphOf(name)} size={size} selected /></span>)}
        </div>
      ))}
    </div>
  );
}

function Glyphs() {
  const big = (node: React.ReactNode, words: string) => <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-2)", color: "var(--basalt-text-primary)", fontSize: "var(--basalt-text-sm-size)" }}>{node}{words}</span>;
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-8)" }}>
      <div className="r75-pair">
        <style>{PAIR}</style>
        <Sheet title="The new two, beside more-nav, play and external" names={["send", "keyboard", "more-nav", "play", "external"]} />
        <Sheet title="Send as the fifth richer action" names={["copy", "edit", "trash", "download", "send"]} />
      </div>
      <div className="r75-pair">
        <div>
          <p style={label}>Today (main): Phosphor Bold draws them</p>
          <div style={{ display: "flex", gap: "var(--basalt-space-6)", flexWrap: "wrap" }}>
            {big(<PaperPlaneRightIcon size={20} weight="bold" />, "Send")}
            {big(<KeyboardIcon size={20} weight="bold" />, "Keyboard")}
            <Button variant="secondary" size="sm" icon={PaperPlaneRightIcon}>Send to the kitchen</Button>
          </div>
        </div>
        <div>
          <p style={label}>This build: the core set's own, 2.25 units on 24</p>
          <div style={{ display: "flex", gap: "var(--basalt-space-6)", flexWrap: "wrap" }}>
            {big(<Icon icon={CoreSet.SendGlyph} size={20} />, "Send")}
            {big(<Icon icon={CoreSet.KeyboardGlyph} size={20} />, "Keyboard")}
            <Button variant="secondary" size="sm" icon={CoreSet.SendGlyph}>Send to the kitchen</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 6. Nav md's label ----

const TODAY_NAV = ".r75-today .basalt-nav-label { font-size: var(--basalt-text-xl-size); line-height: var(--basalt-text-xl-line-height); letter-spacing: var(--basalt-text-xl-tracking); }";
const title: React.CSSProperties = { margin: "0 0 var(--basalt-space-3)", padding: "0 var(--basalt-space-3)", font: "var(--basalt-font-weight-semibold) var(--basalt-text-lg-size) / var(--basalt-text-lg-line-height) var(--basalt-font-family-sans)", letterSpacing: "var(--basalt-text-lg-tracking)", color: "var(--basalt-text-primary)" };

function Sidebar({ today, name, items }: { today: boolean; name: string; items: [string, GlyphIcon][] }) {
  return (
    <div className={today ? "r75-today" : undefined} style={{ minWidth: 0 }}>
      <p style={label}>{today ? "Today (main): the label at 20/28, larger than the app's title" : "This build: the label at 18/26, the title's size"}</p>
      <p style={title}>{name}</p>
      <Nav aria-label={name}>
        {items.map(([words, glyph], i) => <NavItem key={words} href={`#${i}`} icon={glyph} current={i === 0}>{words}</NavItem>)}
      </Nav>
    </div>
  );
}

function NavPair() {
  const recipes: [string, GlyphIcon][] = [["Recipes", CoreSet.HomeGlyph], ["Search", CoreSet.SearchGlyph], ["Week", CoreSet.CalendarGlyph], ["Settings", CoreSet.SettingsGlyph]];
  const builds: [string, GlyphIcon][] = [["Runs", CoreSet.RunsGlyph], ["Records", CoreSet.RecordsGlyph], ["Messages", CoreSet.MessagesGlyph], ["Keyboard", CoreSet.KeyboardGlyph]];
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-8)" }}>
      <style>{`${PAIR} ${TODAY_NAV}`}</style>
      <div className="r75-pair"><Sidebar today name="Recipe box" items={recipes} /><Sidebar today={false} name="Recipe box" items={recipes} /></div>
      <div className="r75-pair"><Sidebar today name="Build server" items={builds} /><Sidebar today={false} name="Build server" items={builds} /></div>
    </div>
  );
}

// ---- 7. CodeBlock ----

const TODAY_CODE = ".r75-today .basalt-code-hint { display: none !important; }";
const RECIPE_CLI = "bake --loaves 2 --oven 220c\r\n\r\nrest --minutes 40 \\\n  --cover damp-cloth\nslice --thickness 12mm --keep-the-heel-for-breadcrumbs-on-sunday\n";
const DEPLOY = "curl --request POST https://builds.example.com/api/v2/pipelines/main/trigger --header 'Authorization: Bearer $TOKEN' --data '{}'";

function Code({ state }: { state: string }) {
  const before = state === "before";
  return (
    <div className={before ? "r75-today" : undefined} style={{ display: "grid", gap: "var(--basalt-space-6)", maxWidth: 640 }}>
      <style>{TODAY_CODE}</style>
      <p style={label}>{before ? "Today (main): a block wider than its box says nothing under it" : "This build: line numbers (an opt-in), and the sideways line under any block wider than its box"}</p>
      <CodeBlock title="bake.sh" language="sh" code={RECIPE_CLI} lineNumbers={!before} startLine={12} />
      <CodeBlock code={DEPLOY} prompt="$" lineNumbers={!before} />
      <CodeBlock code={"retry --build 212 --reason 'the cache was cold on the first run, so the checks timed out'\nlogs --follow"} prompt="$" lineNumbers={!before} wrap />
      <CodeBlock code={DEPLOY} />
    </div>
  );
}

// ---- 8. RichText ----

function Rich() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
      <Card>
        <CardContent>
        <Prose>
          <RichText>
            <p>Fold the butter in <strong>cold</strong>, and <em>never</em> let it melt. If the dough tears, rest it for <code>20 minutes</code> and try again.</p>
            <ul>
              <li>Two cups of flour</li>
              <li>One cup of butter, cubed
                <ul><li>Salted is fine</li></ul>
              </li>
              <li>Ice water, a spoon at a time</li>
            </ul>
            <h3>From the kitchen</h3>
            <blockquote><p>Chill the tin before the dough goes in.</p></blockquote>
            <p>The full card is at <a href="#card">the recipe box</a>.</p>
          </RichText>
        </Prose>
        </CardContent>
      </Card>
      <div style={{ maxWidth: 560, minWidth: 0 }}>
        <RichText>
          <p>The flaky check is <code>buildServerPipelineTriggerForTheMainBranchWithEveryCheckAndEveryArtifactKept</code>; it fails when the cache is cold.</p>
          <ol>
            <li>Warm the cache with <code>prefetch --all</code>.</li>
            <li>Retry from https://builds.example.com/api/v2/pipelines/main/trigger/with/a/very/long/path</li>
          </ol>
          <hr />
          <pre><code>retry --build 212 --reason cold-cache --keep-artifacts-for-thirty-days</code></pre>
        </RichText>
      </div>
    </div>
  );
}

export const ROUND_75: Round = {
  id: "75",
  title: "cimip-gaps-3 t6: find, keys, code, glyphs and content",
  reviewed: false,
  summary:
    "The council's t6 decision, built: every CommandMenu gains the list's foot (a count, and the keys at its end with hints), an empty block with Clear search, the app's own match marks and a row that cannot run; menu rows for the loop hold and single keys, and MenuText; the send and keyboard glyphs; Nav md's label at 18/26; CodeBlock's line numbers and its sideways line; RichText. No token is added. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "menu-foot",
      name: "The modal's foot, count and empty block",
      intro: "Every CommandMenu now has the list's foot band: the count at its start and, with hints, ↵ Run and Esc Close at its end. With nothing shown it says what was typed and offers Clear search. Compare with today's.",
      decisions: [
        "The foot is always there and at least 36px, so it never comes and goes; inside the 480px cap the list gives up the room. `.basalt-command-footer` is retired.",
        "At rest \"7 recipes\" (one: \"1 recipe\"), \"1 of 7\" while filtering, \"0 of 7\" with nothing; `count` replaces the line and `filter={false}` always shows the total. Spoken once after 400ms, never on opening.",
        "With words typed: \"Nothing matches “zzq”.\" and a ghost sm Clear search; with no words and no rows, \"Nothing to show.\". `empty` replaces both. While the block holds a stop, the field's band takes the −2 ring.",
        NOT_REVIEWED,
      ],
      tryIt: ["Type a word that matches nothing, then Tab to Clear search and press Enter: the search empties and focus is back in the field."],
      states: ["before", "filtering", "empty", "before-empty"],
      widths: [1440, 390],
      height: 640,
      demo: ({ state }) => <MenuFoot state={state} />,
    },
    {
      id: "unavailable",
      name: "A row that cannot run, and the app's match marks",
      intro: "A command with `unavailable` stays in its place and can be lit; Enter runs nothing and says why. Its title is disabled ink and its reason, the second line, wraps. Marks are drawn only from the ranges the app sends.",
      decisions: [
        "The default shot has the row at rest (second); `lit` has it first and lit, the plate on it; `marks` is the app's results for \"sha\" with its ranges marked: primary at 600 on a description and a reason, the title's own ink on a danger or unavailable title.",
        "No key chip and no aria-keyshortcuts on it; unavailable wins over danger. Forced colours: at rest the title is GrayText and the reason CanvasText; lit, all of it HighlightText.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press Enter on Share recipe: nothing closes, and a screen reader hears the reason each time."],
      states: ["lit", "marks", "forced-colours", "marks-forced-colours", "more-contrast"],
      widths: [1440, 390],
      height: 640,
      demo: ({ state }) => <Unavailable state={state} />,
    },
    {
      id: "list",
      name: "In the list: the pane says why, the reason wraps",
      intro: "Beside a preview the unavailable row's pane is its reason in the pane's empty form, and ↵ presses nothing. Under 816 the list pushes, and at 390 the reason wraps over two lines. The second list has its own empty block.",
      decisions: ["The row grows by the description's line for each line its reason takes (62, then 18 a line), and the plate covers the whole row.", NOT_REVIEWED],
      tryIt: ["Focus the first list's field: the first row is lit and its pane says why. Type zzq in the second list."],
      widths: [1440, 390],
      height: 900,
      demo: () => <ListUnavailable />,
    },
    {
      id: "menu-rows",
      name: "The loop hold and single keys as menu rows, and MenuText",
      intro: "LoopsToggleMenuItem and SingleKeysMenuItem are checkbox rows on the shipped stores. MenuText is a line of words under a group's label that is not a row: tertiary, never lit, never a stop.",
      decisions: [
        "\"Pause animations\" with the switch's description, which wraps; `description={false}` gives one line (the `second` state, a build server's menu, with MenuText outside any group). \"Single-key shortcuts\" is one line. In a menu, on is a check: never a Switch.",
        "MenuText is 13/18 at 400 in tertiary at the label's edge, space-1 below; it describes its group (aria-describedby), or the menu when it is in none.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press Space on Pause animations: the check shows, the menu stays open, and the page's loops hold."],
      states: ["forced-colours", "second", "second-forced-colours"],
      widths: [1440, 390],
      height: 560,
      demo: ({ state }) => (state === "second" || state === "second-forced-colours" ? <BuildMenu /> : <MenuRows />),
    },
    {
      id: "glyphs",
      name: "send and keyboard",
      intro: "Two core glyphs: send, the fifth richer action (an arrowhead of straight lines with its notch and fold), and keyboard, an object glyph with the top-right opening. Beside more-nav, play and external at 16, 20 and 24, at rest and selected.",
      decisions: [
        "send has one drawing, at rest and selected (no seam, no morph pair). It does not mirror by itself.",
        "keyboard's case is wider than more-nav's box and carries a spacebar, so the two stay apart at 16; selected closes the case, fills it and cuts the keys out.",
        "Done stays two glyphs: the core check does it, Phosphor's CheckCircle says it happened.",
        NOT_REVIEWED,
      ],
      tryIt: ["Compare keyboard and more-nav at 16 in both states."],
      widths: [1440, 390],
      height: 760,
      demo: () => <Glyphs />,
    },
    {
      id: "nav",
      name: "Nav md's label at 18/26",
      intro: "The md label steps from text-xl (20/28) to text-lg (18/26), so it is never larger than the app's title beside it. Nothing else moves: the 48px pill, the 24 glyph, the padding, the count, the rail.",
      decisions: ["Today's side is this build with the label's old size put back, scoped to that side.", NOT_REVIEWED],
      tryIt: ["Compare each pair: only the words change size."],
      widths: [1440, 390],
      height: 760,
      demo: () => <NavPair />,
    },
    {
      id: "code",
      name: "CodeBlock: line numbers and the sideways line",
      intro: "`lineNumbers` (with `startLine`) numbers every source line in a column of its own, before a prompt's; with wrap a number sits on its line's first row. Any block wider than its box now says \"Scroll sideways to see the long lines\" under its code.",
      decisions: [
        "The numbers are Geist Mono 13/20 in tertiary, end-aligned, at least 24px wide, space-4 before what follows, never copied or read; no vertical rule.",
        "The sideways line is the table hint's form: 12/16 tertiary, space-1-5 by space-4, a divider above, aria-hidden, absent in print. No edge fade. Today's side hides it.",
        NOT_REVIEWED,
      ],
      tryIt: ["Select the code and copy it: no number comes with it."],
      states: ["before", "forced-colours"],
      widths: [1440, 390],
      height: 820,
      demo: ({ state }) => <Code state={state} />,
    },
    {
      id: "rich-text",
      name: "RichText: a renderer's elements in Basalt's type",
      intro: "Body 14/20, blocks space-3 apart, lists, strong and em, InlineCode and Link exactly, and a floor for headings, quotes, rules and pre. No parser and no measure: in a Prose in a card, or bare in a column.",
      decisions: ["An 80-character identifier and a long address wrap, so the column never widens (at 390 too); a pre scrolls sideways.", NOT_REVIEWED],
      tryIt: ["Narrow the window: the long identifier breaks inside the column."],
      widths: [1440, 390],
      height: 900,
      demo: () => <Rich />,
    },
  ],
};
