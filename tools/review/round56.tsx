// Round 56: lists and facts (cimip-gaps-2, batch B6). Found by building CIMIP on Basalt; every part here is general and shown in at least two unlike domains
// (a support inbox, a build pipeline, a shared document, a team chat). Synthetic data only. Decided and built by Opus on the no-council path (DECISIONS 226 and 265);
// Astra reviews the code and the lead checks the pixels; nothing here has been reviewed yet. The described-menu step is the owner's pick, option B (DECISIONS 275), as built.
// States: `held-focus` and `held-hover` hold a row with Chromium's forced pseudo-classes (`data-wt-force`); `open` opens the step's dialog or menus; each may end in
// `-forced-colours` or `-reduced-motion`.

import * as React from "react";

import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  CodeBlock,
  DescriptionItem,
  DescriptionList,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  Fieldset,
  FilterToolbar,
  Form,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  MultiSelect,
  PanelList,
  PanelRow,
  SelectableItem,
  SelectableList,
  Select,
  SelectionBar,
  SheetBody,
  SheetFooter,
  SheetHeader,
  Text,
  Textarea,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-3)", minWidth: 0 };
const pair: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "var(--basalt-space-8)", alignItems: "start" };
const Caption = ({ children }: { children: React.ReactNode }) => <Text size="sm" tone="secondary">{children}</Text>;

// ---- 1. PanelList ----

const REQUESTS = [
  { id: "r-2201", title: "Refund for a duplicate charge on the annual plan", from: "Juno Halvorsen · Billing", time: "9:42 AM", status: "warning" as const, word: "Waiting" },
  { id: "r-2198", title: "Can't sign in after changing my email", from: "Teodor Vance · Accounts", time: "8:15 AM", status: "danger" as const, word: "Overdue" },
  { id: "r-2190", title: "Export to CSV drops the last column", from: "Mira Okafor · Reports", time: "Yesterday", status: "success" as const, word: "Answered" },
];
const BUILDS = [
  { id: "b-981", title: "main · Bump the image cache to 30 days", detail: "Checks, unit tests and the browser suite", time: "4m 12s", status: "success" as const, word: "Passed" },
  { id: "b-980", title: "release/2.4 · Pin the font loader", detail: "The browser suite is running", time: "2m 50s", status: "warning" as const, word: "Running" },
  { id: "b-979", title: "feature/search-index · Rebuild the index nightly instead of on every write to the store", detail: "Unit tests failed in search/index.test.ts", time: "11m 03s", status: "danger" as const, word: "Failed" },
];

function Panels({ state }: { state: string }) {
  const kind = kindOf(state);
  return (
    <div style={pair}>
      <div style={stack}>
        <Caption>A support inbox: each request is one link across its band.</Caption>
        <h3 id="r56-requests" className="basalt-visually-hidden">Open requests</h3>
        <PanelList aria-labelledby="r56-requests">
          {REQUESTS.map((r, i) => (
            <PanelRow key={r.id} href={`#${r.id}`} title={r.title} description={r.from} trailing={r.time} leading={<Badge variant="plain" status={r.status}>{r.word}</Badge>} data-wt-force={i === 1 && kind === "held-focus" ? "focus" : i === 0 && kind === "held-hover" ? "hover" : undefined} />
          ))}
        </PanelList>
      </div>
      <div style={stack}>
        <Caption>A build pipeline: rows are buttons that open a build's log; the last is cut and still read whole.</Caption>
        <PanelList aria-label="Recent builds">
          {BUILDS.map((b) => (
            <PanelRow key={b.id} title={b.title} description={b.detail} trailing={b.time} leading={<Badge variant="plain" status={b.status}>{b.word}</Badge>} onClick={() => {}} />
          ))}
          <PanelRow href="https://example.com/builds" target="_blank" title="Every build on the CI site" description="Opens the full history" />
        </PanelList>
      </div>
    </div>
  );
}

// ---- 2. SelectableList ----

const ASKING = [
  { id: "u1", name: "Ada Byrne", detail: "Design · asked to edit", time: "2 min ago" },
  { id: "u2", name: "Kofi Mensah", detail: "Finance · asked to comment", time: "6 min ago" },
  { id: "u3", name: "Lena Ishikawa", detail: "Legal · asked to edit", time: "14 min ago" },
  { id: "u4", name: "Rafael Ortiz", detail: "Sales · asked to view", time: "31 min ago" },
];
const QUEUE = [
  { id: "m1", name: "#launch-planning", detail: "Weekly summary, scheduled for Monday" },
  { id: "m2", name: "#design-review", detail: "Reminder to vote on the new icons" },
  { id: "m3", name: "#support", detail: "Holiday hours for the help desk" },
];

function Selectable({ state }: { state: string }) {
  const kind = kindOf(state);
  const [asking, setAsking] = React.useState<string[]>(kind === "all" ? ASKING.map((a) => a.id) : kind === "none" ? [] : ["u1", "u3"]);
  const [done, setDone] = React.useState<Set<string>>(() => new Set(kind === "done" ? ["u2"] : []));
  const [queued, setQueued] = React.useState<string[]>(["m2"]);
  const open = ASKING.filter((a) => !done.has(a.id)).map((a) => a.id);
  const n = asking.filter((id) => open.includes(id)).length;
  return (
    <div style={pair}>
      <div style={stack}>
        <Caption>A shared document: people asking for access. The bar sticks to the top of its scroller.</Caption>
        <Card style={{ maxHeight: 236, overflowY: "auto" }}>
          <SelectableList
            label="People asking for access"
            values={open}
            value={asking}
            onValueChange={setAsking}
            bar={
              <SelectionBar allLabel="Everyone asking" count={(c, t) => `${c} of ${t} chosen`}>
                <Button size="sm" variant="ghost" disabled={n === 0} focusableWhenDisabled onClick={() => { setDone(new Set([...done, ...asking])); setAsking([]); }}>{n ? `Decline ${n}` : "Decline"}</Button>
                <Button size="sm" disabled={n === 0} focusableWhenDisabled onClick={() => { setDone(new Set([...done, ...asking])); setAsking([]); }}>{n ? `Let ${n} in` : "Let in"}</Button>
              </SelectionBar>
            }
          >
            {ASKING.map((a) => (
              <SelectableItem key={a.id} value={a.id} label={`Choose ${a.name}`}>
                <span style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", columnGap: "var(--basalt-space-3)", alignItems: "center" }}>
                  <Avatar name={a.name} size={24} />
                  <span style={{ display: "grid", minWidth: 0 }}>
                    <span>{a.name}</span>
                    <Text as="span" size="xs" tone="tertiary">{done.has(a.id) ? "Answered" : a.detail}</Text>
                  </span>
                  <Text as="span" size="xs" tone="secondary" tabular>{a.time}</Text>
                </span>
              </SelectableItem>
            ))}
          </SelectableList>
        </Card>
      </div>
      <div style={stack}>
        <Caption>A team chat: scheduled messages, the bar under the rows, sticking to the scroller's foot (as at the foot of a sheet).</Caption>
        <Card style={{ maxHeight: 180, overflowY: "auto" }}>
          <SelectableList
            label="Scheduled messages"
            values={QUEUE.map((q) => q.id)}
            value={queued}
            onValueChange={setQueued}
            barSide="bottom"
            bar={
              <SelectionBar>
                <Button size="sm" variant="danger" disabled={queued.length === 0} focusableWhenDisabled>Unschedule</Button>
              </SelectionBar>
            }
          >
            {QUEUE.map((q) => (
              <SelectableItem key={q.id} value={q.id}>
                <span style={{ display: "grid" }}>
                  <span>{q.name}</span>
                  <Text as="span" size="xs" tone="secondary">{q.detail}</Text>
                </span>
              </SelectableItem>
            ))}
          </SelectableList>
        </Card>
      </div>
    </div>
  );
}

// ---- 3. DescriptionList narrow="line", and missing words ----

function Facts() {
  const column: React.CSSProperties = { width: 320, maxWidth: "100%", padding: "var(--basalt-space-4)" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-6)", alignItems: "start" }}>
      <div style={stack}>
        <Caption>A build, stacked (the default under 480).</Caption>
        <Card style={column}>
          <DescriptionList>
            <DescriptionItem term="Branch" mono>release/2.4</DescriptionItem>
            <DescriptionItem term="Started by">Priya Raman</DescriptionItem>
            <DescriptionItem term="Coverage" missing />
            <DescriptionItem term="Reviewer" missing>None yet</DescriptionItem>
          </DescriptionList>
        </Card>
      </div>
      <div style={stack}>
        <Caption>The same facts, narrow="line": one row each.</Caption>
        <Card style={column}>
          <DescriptionList narrow="line">
            <DescriptionItem term="Branch" mono>release/2.4</DescriptionItem>
            <DescriptionItem term="Started by">Priya Raman</DescriptionItem>
            <DescriptionItem term="Coverage" missing />
            <DescriptionItem term="Reviewer" missing>None yet</DescriptionItem>
          </DescriptionList>
        </Card>
      </div>
      <div style={stack}>
        <Caption>A support request, narrow="line", with a value of several lines.</Caption>
        <Card style={column}>
          <DescriptionList narrow="line">
            <DescriptionItem term="Customer" values={["Juno Halvorsen", <Text key="s" as="span" size="sm" tone="secondary">Annual plan since Mar 2024</Text>, <Button key="b" size="sm" variant="secondary">Open account</Button>]} />
            <DescriptionItem term="Assigned to" missing>No one</DescriptionItem>
            <DescriptionItem term="Linked issue" missing>No issue linked</DescriptionItem>
            <DescriptionItem term="Last reply">Today, 9:42 AM</DescriptionItem>
          </DescriptionList>
        </Card>
      </div>
    </div>
  );
}

// ---- 4. CodeBlock wrap ----

const DEPLOY = "deploy --project storefront-web --region us-east-2 --image registry.example.com/web:2.4.1 --replicas 3 --confirm";
const MIGRATE = "psql \"$DATABASE_URL\" --set ON_ERROR_STOP=1 --file migrations/2026-11-22-add-order-index.sql";

function Code() {
  return (
    <div style={pair}>
      <div style={stack}>
        <Caption>A command to approve, as shipped: it scrolls sideways.</Caption>
        <CodeBlock code={DEPLOY} language="sh" prompt="$" />
        <Caption>wrap: it breaks at spaces only, so every flag and the image name stay whole.</Caption>
        <CodeBlock code={DEPLOY} language="sh" prompt="$" wrap />
      </div>
      <div style={stack}>
        <Caption>wrap with no prompt: a continuation is indented 2ch, so it never reads as a new line. The file name is longer than the line at 390, so the block scrolls for it.</Caption>
        <CodeBlock code={`${MIGRATE}\n\n# then\nnpm run reindex -- --table orders --batch-size 5000`} language="sh" title="Run once" wrap />
      </div>
    </div>
  );
}

// ---- 5. Select toolbar ----

const STATUS = [{ value: "any", label: "Any status" }, { value: "open", label: "Open" }, { value: "waiting", label: "Waiting on customer" }, { value: "closed", label: "Closed" }];
const OWNER = [{ value: "anyone", label: "Anyone" }, { value: "me", label: "Assigned to me" }, { value: "none", label: "No one" }];
const BRANCH = [{ value: "all", label: "All branches" }, { value: "main", label: "main" }, { value: "release", label: "release/2.4" }];
const RESULT = [{ value: "any", label: "Any result" }, { value: "passed", label: "Passed" }, { value: "failed", label: "Failed" }];

function Toolbars() {
  return (
    <div style={{ ...stack, gap: "var(--basalt-space-6)" }}>
      <div style={stack}>
        <Caption>A support inbox: a search and two selects share one row; each select is as wide as its widest option.</Caption>
        <FilterToolbar label="Filter requests" search={<Input type="search" aria-label="Search requests" placeholder="Search requests" />} filter={[<Select key="s" toolbar aria-label="Status" defaultValue="any" options={STATUS} />, <Select key="o" toolbar aria-label="Assignee" defaultValue="anyone" options={OWNER} />]} />
      </div>
      <div style={stack}>
        <Caption>A build pipeline: the same, in a plain row. Choosing "release/2.4" moves nothing after it.</Caption>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-2)" }}>
          <Select toolbar aria-label="Branch" defaultValue="all" options={BRANCH} />
          <Select toolbar aria-label="Result" defaultValue="any" options={RESULT} />
          <Button variant="secondary">Run again</Button>
        </div>
      </div>
      <div style={stack}>
        <Caption>Before: a Select fills its container, so two cannot share a row.</Caption>
        <div style={{ display: "flex", gap: "var(--basalt-space-2)" }}>
          <Select aria-label="Branch, as shipped" defaultValue="all" options={BRANCH} />
          <Select aria-label="Result, as shipped" defaultValue="any" options={RESULT} />
        </div>
      </div>
    </div>
  );
}

// ---- 6. The form dialog's body ----

function Reply({ open, domain }: { open: boolean; domain: "support" | "doc" }) {
  const [text, setText] = React.useState("");
  const words = domain === "support"
    ? { opener: "Reply", title: "Reply to Juno Halvorsen", description: "They see this by email and on the request's page. Internal notes stay hidden.", ready: [["Looking into it", "Thanks for the details. I'm looking into the duplicate charge now."], ["Refund sent", "The refund is on its way and shows in 5 to 10 business days."]], label: "Message", send: "Send reply",
        many: { label: "Tags", options: ["Billing", "Refund", "Account", "Bug"], chosen: ["Billing"] }, group: { legend: "Also send to", boxes: [["owner", "The account owner", true], ["finance", "Finance", false]] } }
    : { opener: "Comment", title: "Comment on “Q1 plan”", description: "Everyone who can view the document sees the comment beside the paragraph.", ready: [["Approve", "Approved from my side."], ["Needs a source", "Can we add a source for this number?"]], label: "Comment", send: "Post comment",
        many: { label: "Mention", options: ["Ada Byrne", "Kofi Mensah", "Lena Ishikawa"], chosen: [] as string[] }, group: { legend: "Notify", boxes: [["editors", "Everyone who can edit", true], ["mentioned", "Only people mentioned", false]] } };
  return (
    <Dialog defaultOpen={open}>
      <DialogTrigger render={<Button variant="secondary">{words.opener}</Button>} />
      <DialogContent form>
        <SheetHeader closeLabel={`Close ${words.opener.toLowerCase()}`}><DialogTitle>{words.title}</DialogTitle></SheetHeader>
        <SheetBody>
          <DialogDescription>{words.description}</DialogDescription>
          <div role="group" aria-label="Ready answers" style={{ display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-2)" }}>
            {words.ready.map(([label, sentence]) => <Button key={label} size="sm" onClick={() => setText(sentence!)}>{label}</Button>)}
          </div>
          <Form id={`r56-${domain}`} onSubmit={(e) => e.preventDefault()}>
            <Field label={words.label}><Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
            {/* Values beyond a text field: any of many (a multi-select) and a checked group. */}
            <MultiSelect label={words.many.label} options={words.many.options.map((o) => ({ value: o, label: o }))} defaultValue={words.many.chosen} />
            <Fieldset legend={words.group.legend}>
              {words.group.boxes.map(([value, label, on]) => <Checkbox key={String(value)} name={`r56-${domain}-group`} value={String(value)} defaultChecked={Boolean(on)}>{label}</Checkbox>)}
            </Fieldset>
          </Form>
        </SheetBody>
        <SheetFooter><DialogActions><DialogClose render={<Button variant="secondary">Cancel</Button>} /><Button variant="primary" type="submit" form={`r56-${domain}`}>{words.send}</Button></DialogActions></SheetFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dialogs({ state }: { state: string }) {
  const kind = kindOf(state);
  return (
    <div style={stack}>
      <Caption>Ready answers sit between the description and the field: space-4 above the label, as one field sits above the next.</Caption>
      <div style={{ display: "flex", gap: "var(--basalt-space-2)" }}>
        <Reply open={kind === "open"} domain="support" />
        <Reply open={kind === "open-doc"} domain="doc" />
      </div>
    </div>
  );
}

// ---- 7. Described menu rows that wrap (DECISIONS 275, option B) ----

const ROLES = [
  { value: "view", label: "Can view", description: "Reads the document and its comments, and cannot change anything" },
  { value: "comment", label: "Can comment", description: "Adds comments and suggestions that an editor accepts or declines" },
  { value: "edit", label: "Can edit", description: "Changes the text, accepts suggestions and shares it with people in the workspace" },
];
const ALERTS = [
  { value: "all", label: "Every message", description: "A notification for each new message in the channel, on every device" },
  { value: "mentions", label: "Mentions only", description: "Only when someone names you or the whole channel, and replies to your threads" },
  { value: "off", label: "Off", description: "Nothing" },
];

function DescribedMenu({ items, label, after, open }: { items: typeof ROLES; label: string; after: string; open: boolean }) {
  const [value, setValue] = React.useState(items[1]!.value);
  return (
    <Menu defaultOpen={open} modal={false}>
      <MenuTrigger render={<Button variant="secondary">{label}</Button>} />
      <MenuContent>
        <MenuRadioGroup value={value} onValueChange={(v) => setValue(String(v))}>
          {items.map((item) => <MenuRadioItem key={item.value} value={item.value} description={item.description}>{item.label}</MenuRadioItem>)}
        </MenuRadioGroup>
        {/* A one-line row after the described ones: the plate glides between rows of different heights. */}
        <MenuItem>{after}</MenuItem>
      </MenuContent>
    </Menu>
  );
}

function MenuWrap({ state }: { state: string }) {
  const open = state.startsWith("menu");
  const chat = state.includes("chat");
  return (
    <div style={stack}>
      <Caption>{chat ? "A team chat's notifications: a short description stays one line; a long one wraps." : "A shared document's access: each description wraps inside the 320 menu; the title stays one line."}</Caption>
      <div style={{ display: "flex", gap: "var(--basalt-space-2)" }}>
        {chat ? <DescribedMenu items={ALERTS} label="Notifications" after="Mute for an hour" open={open} /> : <DescribedMenu items={ROLES} label="Access" after="Copy link" open={open} />}
      </div>
    </div>
  );
}

// ---- 8. A plain Badge's size ----

function Badges() {
  return (
    <div style={{ ...stack, fontSize: "var(--basalt-text-base-size)", lineHeight: "var(--basalt-text-base-line-height)" }}>
      <Caption>A plain Badge is a word in its line: it takes the line's size. The app sets its base type on its root (here 14/20, text-base), and the mark's seat follows a larger line with `size`.</Caption>
      <Card style={{ padding: "var(--basalt-space-4)", display: "grid", gap: "var(--basalt-space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--basalt-space-3)" }}><span>Nightly export</span><Badge variant="plain" status="success">Passed</Badge></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--basalt-space-3)", fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)" }}><span>In a 13px row</span><Badge variant="plain" status="warning">Waiting</Badge></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--basalt-space-3)", fontSize: "var(--basalt-text-2xl-size)", lineHeight: "var(--basalt-text-2xl-line-height)", fontWeight: 600 }}><span>Q1 plan</span><Badge variant="plain" size={20} status="neutral">Draft</Badge></div>
      </Card>
    </div>
  );
}

const MEDIA = ["forced-colours", "reduced-motion"];

export const ROUND_56: Round = {
  id: "56",
  title: "Lists and facts (cimip-gaps-2, B6): a panel of rows, a list to choose from, one-line facts, code that wraps, a select at its own width",
  reviewed: false,
  summary:
    "Gaps found by building CIMIP on Basalt, closed as general parts and shown in two unlike domains each (a support inbox, a build pipeline, a shared document, a team chat). Decided and built by Opus on the no-council path (DECISIONS 226 and 265); the code review is Astra's and the pixels are the lead's, and neither has happened yet. Described menu rows wrap inside 320, the owner's pick (DECISIONS 275). Entries outside the notification centre are closed by B7's NotificationList, not here.",
  steps: [
    {
      id: "panel-list",
      name: "A panel of rows (PanelList, PanelRow)",
      intro: "Rows of one list in one rimmed panel, each row a link or a button across its whole band.",
      decisions: [
        "Its own part, not a variant of DirectoryList: the directory is a site's ruled list on the page, with no rim, no wash, three fixed columns and an arrow; this is an app's list of things to open in one panel, where the band is the target.",
        "The panel is a panel: one above what it sits in (3 at most), the one rim, radius 12, a border-divider between rows and never above the first or below the last.",
        "A row is a title (primary, 500), an optional description (secondary, text-sm), a leading seat centred on the title line and a trailing value on it (secondary, tabular, never cut). Title and description are one line each and cut with an ellipsis, so a row's height is known; the whole text is still read.",
        "Hover is the hover wash, full bleed, lifting no ink; a press steps to the selected wash; focus is the 2px ring at −2 inside, because the band is flush with the panel's clipping edge (foundations' flush band), and the first and last rows take the panel's inner corner (12 less the rim) so the ring follows it.",
        "A row that opens a new tab draws the new-tab arrow after its title and says so. On a coarse pointer a row is at least 44.",
      ],
      tryIt: ["Tab through the inbox: the ring is inside each band and follows the panel's corners on the first and last rows.", "Hover a row: the wash runs edge to edge and no ink changes."],
      states: ["held-focus", "held-hover", ...MEDIA, "held-focus-forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 520,
      demo: ({ state }) => <Panels state={state} />,
    },
    {
      id: "selectable-list",
      name: "A list to choose from (SelectableList, SelectableItem, SelectionBar)",
      intro: "A checkbox per row, an all box that goes mixed, a count in words and the actions on what is chosen, outside a table.",
      decisions: [
        "As a table's selection (foundations, Selected rows): a chosen row is the selected wash as a band, and its checked box carries the state (the wash alone is about 1.2:1); rows are divided as a table's are.",
        "The row is its checkbox's label, so a press anywhere on the row chooses it; focus is the box's own ring at +2, inside the row's padding (a band holding its own control focuses that control).",
        "The bar: the all box (checked when every row is chosen, mixed when some are, disabled when none can be), the count in words in a polite status line with its room held for the widest count, then the actions at the end. The app's words: 'Everyone asking', '2 of 3 chosen'; Basalt's default is 'Select all' and '2 of 3 selected'.",
        "The bar sticks to its edge of the scroller (top, or bottom for a list at a sheet's foot), opaque in its surface's colour on a divider; it is not the smoked surface.",
        "A row whose value has left `values` (one dealt with) keeps its place and its box with an empty check seat, so nothing moves under a pointer; it is no longer counted.",
      ],
      tryIt: ["Choose the all box with one row chosen: it fills every row; press it again to clear.", "Let two people in: their rows stay, with an empty seat, and the count drops."],
      states: ["all", "none", "done", ...MEDIA],
      widths: [1440, 390],
      touch: true,
      height: 560,
      demo: ({ state }) => <Selectable state={state} />,
    },
    {
      id: "facts",
      name: "One-line facts in a narrow column, and missing-value words (DescriptionList narrow, DescriptionItem missing)",
      intro: "A description list in a 320 column, stacked as shipped and on one line each with narrow=\"line\"; absent values in the app's own words.",
      decisions: [
        "`narrow=\"line\"` keeps the label and the value on one row under 480 of the list's own width. The label column narrows to size-field-label-inline (80px), the inline field label's, so no new token is made; a long label wraps inside it, and several values stack in the value column space-1 apart, as from 480.",
        "The default stays `stack`, so no shipped list changes.",
        "Missing-value words: 'Not observed' is for a reading that could have been taken and was not (a coverage figure, a sensor). Anything else that is absent says what is absent in the app's words, passed as the children of a `missing` item ('None yet', 'No one', 'No issue linked'), in the same tertiary ink with no mark; never blank, a dash or zero. TableCell notObserved already takes its words the same way.",
      ],
      tryIt: ["Compare the first two cards: the same facts, half the height on one line each."],
      states: [...MEDIA],
      widths: [1440, 390],
      touch: true,
      height: 520,
      demo: () => <Facts />,
    },
    {
      id: "code-wrap",
      name: "Code that wraps (CodeBlock wrap)",
      intro: "An opt-in wrap that breaks a long line at spaces only, so a command can be read whole at 390.",
      decisions: [
        "Each run of characters between spaces is drawn as one word that never breaks inside (a flag, a path, an image name), and the spaces stand between them, so a line breaks at a space and nowhere else: never after a hyphen, a slash or a dot, which the browser's own wrap would break at.",
        "A word longer than the line is not broken: the block still scrolls sideways for it, as an unwrapped block does.",
        "With no prompt each line is a row whose continuation is indented 2ch, so a wrapped line never reads as a new one; beside a prompt the gutter marks where a line starts.",
        "Copy takes the code exactly as given; the default stays scrolling.",
      ],
      tryIt: ["At 390, read the deploy command whole in the second block."],
      states: [...MEDIA],
      widths: [1440, 390],
      touch: true,
      height: 560,
      demo: () => <Code />,
    },
    {
      id: "select-toolbar",
      name: "A select at its own width (Select toolbar)",
      intro: "A Select that is as wide as its widest option, so selects and a search can share a toolbar row.",
      decisions: [
        "The trigger reserves the width of its widest label (every option and the placeholder stand unseen in the value's one cell), as MultiSelect toolbar does, so a choice moves nothing after it. `numeric` stays the form for numbers.",
        "In a column narrower than that it fills the column and cuts the value with an ellipsis; in FilterToolbar under 720 it fills its column, as the filters' triggers do.",
      ],
      tryIt: ["Choose 'Waiting on customer': the Assignee select does not move."],
      states: [...MEDIA],
      widths: [1440, 390],
      touch: true,
      height: 480,
      demo: () => <Toolbars />,
    },
    {
      id: "dialog-body",
      name: "Content between a form dialog's description and its first field",
      intro: "A spacing rule, not a slot: what the body holds after the description is one stack at the form gap.",
      decisions: [
        "A block between the description and the first field (a row of ready answers, a callout, a sentence) sits space-4 above the field's label, as one field sits above the next; the description keeps its own space-5 under it (the two collapse).",
        "No slot: the body already takes any children, and a slot would only fix their order. The group's name is the app's ('Ready answers').",
        "Each form holds values beyond a text field, in both domains: any of many (a MultiSelect: tags on a reply, people to mention on a comment) and a checked group (a Fieldset of Checkboxes: who else is sent the reply, who is notified of the comment). The dialog's dirty-state reading of these is AF's (audit F4), not this batch's.",
      ],
      tryIt: ["Open Reply and press 'Refund sent': the sentence fills the field."],
      states: ["open", "open-doc", "open-forced-colours", "open-reduced-motion"],
      widths: [1440, 390],
      touch: true,
      height: 640,
      demo: ({ state }) => <Dialogs state={state} />,
    },
    {
      id: "menu-wrap",
      name: "Described menu rows that wrap (DECISIONS 275)",
      intro: "The owner's pick, option B: a Menu stays at most 320 wide, and a described row's description wraps inside it, the row growing a line for each.",
      decisions: [
        "The owner picked option B from the three pictured in this round (DECISIONS 275); A (cut at 320) and C (wider, up to the window) are dropped.",
        "A Menu stays at most size-popover-max (320) wide. A description longer than that wraps; the row grows by the description's 18px line for each line it takes. The title stays one line, cut with an ellipsis, with its glyph, check and chip on it.",
        "The row's own plate covers the whole taller row, and the shared plate takes each row's own height as it glides between a wrapped row and a one-line row; the keyboard moves it at once.",
        "Menus only: Select, Combobox and the command menu keep their descriptions to one cut line. React (MenuContent) and the HTML skill's menu module both draw it.",
      ],
      tryIt: ["Open Access and move the pointer from Can view to Copy link: the plate glides and changes height.", "At 390, the descriptions take two or three lines; the menu is never wider than the window less 16px each side."],
      states: ["menu", "menu-lit", "menu-glide@1440", "menu-chat", "menu-chat-lit", "menu-forced-colours-lit", "menu-reduced-motion"],
      widths: [1440, 390],
      touch: true,
      height: 480,
      demo: ({ state }) => <MenuWrap state={state} />,
    },
    {
      id: "badge-size",
      name: "A plain Badge takes its line's size",
      intro: "Closed with no change: a plain Badge is a word in its line and sets no size of its own.",
      decisions: [
        "Kept by design: a plain badge is the dot and the word in a table cell, a row or a heading, and its `size` (16, 20, 24) sizes the mark to the word's cap height, which only works if the word takes its line's size. A badge that set 14px would be wrong in a 13px cell and under a 24px heading.",
        "Guidance, added to foundations: an app sets its base type on its root (`font: text-base`), as it sets the page's colour, so a word outside a component is never the browser's 16px.",
      ],
      tryIt: ["Compare the three rows: each badge is the size of its line."],
      states: [],
      widths: [1440, 390],
      height: 360,
      demo: () => <Badges />,
    },
  ],
};
